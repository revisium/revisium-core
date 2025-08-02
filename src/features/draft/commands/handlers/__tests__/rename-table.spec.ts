import { CommandBus } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import * as objectHash from 'object-hash';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameTableCommand,
  RenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/rename-table.command';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  InitMigration,
  RenameMigration,
} from 'src/features/share/utils/schema/types/migration';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RenameTableHandler', () => {
  const nextTableId = 'nextTableId';

  it('should throw an error if the tableId is shorter than 1 character', async () => {
    const { tableId, draftRevisionId } = await prepareProject(prismaService);

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId: '',
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'It must contain between',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareProject(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new RenameTableCommand({
      revisionId: 'unreal',
      tableId,
      nextTableId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findTableInRevisionOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Table not found'),
    );

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Table not found');
  });

  it('should throw an error if the table already exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      nextTableId: tableId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A table with this name already exists in the revision',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      nextTableId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should rename the table', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);

    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);

    const { schemaRow, table } = await getSchemaRowAndTable(ids);

    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(schemaRow.id).toStrictEqual(nextTableId);
    expect(table.id).toBe(nextTableId);
    expect(table.versionId).toBe(ids.draftTableVersionId);
    await revisionCheck(ids);
    await migrationCheck({ revisionId: draftRevisionId, tableId, nextTableId });
  });

  it('should rename table if the table is readonly', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);

    const { schemaRow, table } = await getSchemaRowAndTable(ids);

    const previousTable = await prismaService.table.findUniqueOrThrow({
      where: { versionId: result.previousTableVersionId },
    });
    const draftTable = await prismaService.table.findUniqueOrThrow({
      where: { versionId: result.tableVersionId },
    });

    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(schemaRow.id).toStrictEqual(nextTableId);
    expect(table.id).toBe(nextTableId);
    expect(table.versionId).not.toBe(ids.draftTableVersionId);
    expect(draftTable.createdAt).toStrictEqual(previousTable.createdAt);
    expect(draftTable.createdAt).not.toBe(draftTable.updatedAt);
    await revisionCheck(ids);
  });

  async function revisionCheck(ids: PrepareProjectReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  }

  async function migrationCheck({
    revisionId,
    tableId,
    nextTableId,
  }: {
    revisionId: string;
    tableId: string;
    nextTableId: string;
  }) {
    const rows = await prismaService.row.findMany({
      where: {
        data: {
          path: ['tableId'],
          equals: tableId,
        },
        tables: {
          some: {
            id: SystemTables.Migration,
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
      },
      orderBy: {
        id: Prisma.SortOrder.desc,
      },
    });

    expect(rows.length).toBe(2);

    const rowInit = rows[1];
    const dataInit = rowInit.data as InitMigration;
    expect(dataInit.changeType).toBe('init');

    const rowRename = rows[0];

    const data = rowRename.data as RenameMigration;
    expect(rowRename.id).toBe(data.id);
    expect(rowRename.meta).toStrictEqual({});
    expect(rowRename.hash).toBe(objectHash(data));
    expect(rowRename.schemaHash).toBe(objectHash(tableMigrationsSchema));
    expect(data.changeType).toBe('rename');
    expect(data.tableId).toBe(tableId);
    expect(data.nextTableId).toBe(nextTableId);
  }

  async function getSchemaRowAndTable(ids: PrepareProjectReturnType) {
    const schemaRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextTableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: ids.draftRevisionId,
              },
            },
          },
        },
      },
    });

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        createdId: ids.tableCreatedId,
        revisions: {
          some: {
            id: ids.draftRevisionId,
          },
        },
      },
    });

    return {
      schemaRow,
      table,
    };
  }

  function runTransaction(
    command: RenameTableCommand,
  ): Promise<RenameTableCommandReturnType> {
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
