import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameTableCommand,
  RenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/rename-table.command';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TableApiService } from 'src/features/table/table-api.service';
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
      'Table ID must be 1 to 64 characters, start with a letter or underscore, and contain only letters (a-z, A-Z), digits (0-9), underscores (_), and hyphens (-).',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new RenameTableCommand({
      revisionId: 'unreal',
      tableId,
      nextTableId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findTableInRevisionOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Table not found'));

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Table not found');
  });

  it('should throw an error if IDs are the same', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      nextTableId: tableId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'New ID must be different from current',
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
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    const oldTable = await tableApiService.getTable({
      revisionId: draftRevisionId,
      tableId,
    });
    expect(oldTable).toBeNull();

    const newTable = await tableApiService.getTable({
      revisionId: draftRevisionId,
      tableId: nextTableId,
    });
    expect(newTable).not.toBeNull();
    expect(newTable?.id).toBe(nextTableId);
  });

  function runTransaction(
    command: RenameTableCommand,
  ): Promise<RenameTableCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;
  let tableApiService: TableApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
    tableApiService = result.module.get<TableApiService>(TableApiService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  describe('views integration', () => {
    it('should rename views row when renaming table that has views configured', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const viewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          versionId: viewsTableVersionId,
          createdId: nanoid(),
          readonly: false,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      const viewsRowVersionId = nanoid();
      await prismaService.row.create({
        data: {
          id: tableId,
          versionId: viewsRowVersionId,
          createdId: nanoid(),
          readonly: false,
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [{ id: 'default', name: 'Default' }],
          },
          hash: '',
          schemaHash: '',
          tables: {
            connect: { versionId: viewsTableVersionId },
          },
        },
      });

      const viewsRowBefore = await prismaService.row.findFirst({
        where: {
          id: tableId,
          tables: { some: { versionId: viewsTableVersionId } },
        },
      });
      expect(viewsRowBefore).not.toBeNull();

      const command = new RenameTableCommand({
        revisionId: draftRevisionId,
        tableId,
        nextTableId,
      });
      await runTransaction(command);

      const viewsRowAfterOld = await prismaService.row.findFirst({
        where: {
          id: tableId,
          tables: {
            some: {
              id: SystemTables.Views,
              revisions: { some: { id: draftRevisionId } },
            },
          },
        },
      });
      expect(viewsRowAfterOld).toBeNull();

      const viewsRowAfterNew = await prismaService.row.findFirst({
        where: {
          id: nextTableId,
          tables: {
            some: {
              id: SystemTables.Views,
              revisions: { some: { id: draftRevisionId } },
            },
          },
        },
      });
      expect(viewsRowAfterNew).not.toBeNull();
      expect(viewsRowAfterNew!.data).toEqual({
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      });
    });

    it('should not fail when renaming table without views', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new RenameTableCommand({
        revisionId: draftRevisionId,
        tableId,
        nextTableId,
      });

      await expect(runTransaction(command)).resolves.toBeDefined();
    });

    it('should not fail when views table exists but no views row for table', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          versionId: nanoid(),
          createdId: nanoid(),
          readonly: false,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      const command = new RenameTableCommand({
        revisionId: draftRevisionId,
        tableId,
        nextTableId,
      });

      await expect(runTransaction(command)).resolves.toBeDefined();
    });
  });
});
