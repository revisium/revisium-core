import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
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
      `A row with this name = ${rowId} already exists in the table`,
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
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
      'A row with this name does not exist in the revision',
    );
  });

  it('should update the row if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      rowCreatedId,
    } = ids;

    const command = new RenameRowCommand({
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

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextRowId,
        tables: {
          some: {
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.createdId).toBe(rowCreatedId);
    expect(row.versionId).toBe(draftRowVersionId);
    await checkRevision(ids);
  });

  it('should update the row in a new created table if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
      draftTableVersionId,
      draftRowVersionId,
    } = ids;
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextRowId,
        tables: {
          some: {
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.createdId).toBe(rowCreatedId);
    expect(row.versionId).toBe(draftRowVersionId);
    await checkRevision(ids);
  });

  it('should update a new created row in the table if conditions are met', async () => {
    const ids = await prepareProject(prismaService);

    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
      draftTableVersionId,
      draftRowVersionId,
    } = ids;
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RenameRowCommand({
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

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextRowId,
        tables: {
          some: {
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.createdId).toBe(rowCreatedId);
    expect(row.versionId).not.toBe(draftRowVersionId);
    await checkRevision(ids);
  });

  it('should update the linked row', async () => {
    const { draftRevisionId, tableId, rowId, linkedTableId, linkedRowId } =
      await prepareProject(prismaService, { createLinkedTable: true });
    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    await runTransaction(command);

    const linkedRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: linkedRowId,
        tables: {
          some: {
            id: linkedTableId,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });

    expect(linkedRow.data).toStrictEqual({ link: nextRowId });
  });

  async function checkRevision(ids: PrepareProjectReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });

    expect(revision.hasChanges).toBe(true);
  }

  function runTransaction(
    command: RenameRowCommand,
  ): Promise<RenameRowCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
