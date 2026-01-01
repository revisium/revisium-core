import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';

describe('InternalRenameRowHandler', () => {
  const nextRowId = 'nextRowId';

  it('should throw an error if the rowId is shorter than 1 character', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId,
      nextRowId: '',
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Row ID must be between 1 and 100 characters',
    );
  });

  it('should throw an error if rowId equals nextRowId', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      nextRowId: rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'New ID must be different from current',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareProject(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
      nextRowId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unrealRow',
      nextRowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Row "unrealRow" not found in table',
    );
  });

  it('should rename the row if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareProject(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const previousRow = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.previousRowVersionId,
      },
    });
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.versionId).toBe(draftRowVersionId);
    expect(row.createdId).toBe(rowCreatedId);

    expect(previousRow.versionId).toStrictEqual(row.versionId);
    expect(previousRow.createdAt).toStrictEqual(row.createdAt);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(previousRow.publishedAt).toStrictEqual(row.publishedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);

    expect(result.previousTableVersionId).toStrictEqual(result.tableVersionId);
  });

  it('should rename the row in a new created table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareProject(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);

    const previousTable = await prismaService.table.findUniqueOrThrow({
      where: { versionId: result.previousTableVersionId },
    });
    const draftTable = await prismaService.table.findUniqueOrThrow({
      where: { versionId: result.tableVersionId },
    });
    const previousRow = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.previousRowVersionId,
      },
    });
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.versionId).not.toBe(draftRowVersionId);
    expect(row.createdId).toBe(rowCreatedId);

    expect(previousRow.versionId).not.toStrictEqual(row.versionId);
    expect(previousRow.createdAt).toStrictEqual(row.createdAt);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(previousRow.publishedAt).toStrictEqual(row.publishedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);

    expect(result.previousTableVersionId).not.toStrictEqual(
      result.tableVersionId,
    );
    expect(previousTable.createdAt).toStrictEqual(draftTable.createdAt);
    expect(draftTable.createdAt).not.toStrictEqual(draftTable.updatedAt);
  });

  it('should rename a new created row in the table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareProject(prismaService);
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);

    const previousRow = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.previousRowVersionId,
      },
    });
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.createdId).toBe(rowCreatedId);
    expect(row.versionId).not.toBe(draftRowVersionId);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);

    expect(previousRow.versionId).not.toStrictEqual(row.versionId);
    expect(previousRow.createdAt).toStrictEqual(row.createdAt);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(previousRow.publishedAt).toStrictEqual(row.publishedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);
  });

  it('should update foreign keys in linked rows when renaming a row', async () => {
    const { draftRevisionId, tableId, rowId, linkedTable, linkedRow } =
      await prepareProject(prismaService, { createLinkedTable: true });

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    await runTransaction(command);

    const prismaLinkedRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: linkedRow?.rowId,
        tables: {
          some: {
            id: linkedTable?.tableId,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });

    expect(prismaLinkedRow.data).toStrictEqual({ link: nextRowId });
  });

  function runTransaction(
    command: InternalRenameRowCommand,
  ): Promise<InternalRenameRowCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
