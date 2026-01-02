import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RenameRowHandler', () => {
  const nextRowId = 'nextRowId';

  it('should throw an error if the rowId is shorter than 1 character', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId,
      nextRowId: '',
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Row ID must be 1 to ',
    );
  });

  it('should throw an error if a similar row already exists', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new RenameRowCommand({
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

    const command = new RenameRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
      nextRowId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId: tableId,
      nextRowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RenameRowCommand({
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
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);
    expect(result.rowVersionId).toBeTruthy();

    const oldRow = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(oldRow).toBeNull();

    const newRow = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: nextRowId,
    });
    expect(newRow).not.toBeNull();
    expect(newRow?.id).toBe(nextRowId);
  });

  it('should update the linked row', async () => {
    const { draftRevisionId, tableId, rowId, linkedTable, linkedRow } =
      await prepareProject(prismaService, { createLinkedTable: true });
    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    await runTransaction(command);

    const updatedLinkedRow = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId: linkedTable!.tableId,
      rowId: linkedRow!.rowId,
    });
    expect(updatedLinkedRow).not.toBeNull();
    expect(updatedLinkedRow?.data).toStrictEqual({ link: nextRowId });
  });

  it('should not modify publishedAt when renaming row', async () => {
    const { draftRevisionId, tableId, rowId, linkedTable, linkedRow } =
      await prepareProject(prismaService, { createLinkedTable: true });

    const originalRow = await prismaService.row.findFirstOrThrow({
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

    const originalPublishedAt = originalRow.publishedAt;
    expect(originalPublishedAt).toBeTruthy();

    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    await runTransaction(command);

    const updatedRow = await prismaService.row.findFirstOrThrow({
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

    expect(updatedRow.publishedAt).toStrictEqual(originalPublishedAt);
  });

  function runTransaction(
    command: RenameRowCommand,
  ): Promise<RenameRowCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let rowApiService: RowApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    rowApiService = result.module.get<RowApiService>(RowApiService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
