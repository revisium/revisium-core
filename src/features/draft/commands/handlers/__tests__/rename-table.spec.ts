import { CommandBus } from '@nestjs/cqrs';
import {
  prepareBranch,
  PrepareBranchReturnType,
} from 'src/__tests__/utils/prepareBranch';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameTableCommand,
  RenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/rename-table.command';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RenameTableHandler', () => {
  const nextTableId = 'nextTableId';

  it('should throw an error if the tableId is shorter than 1 character', async () => {
    const { tableId, draftRevisionId } = await prepareBranch(prismaService);

    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId: '',
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'The length of the table name must be greater than or equal to 1',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareBranch(prismaService);

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
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

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
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

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
    const { draftRevisionId } = await prepareBranch(prismaService);

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
    const ids = await prepareBranch(prismaService);
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

    expect(schemaRow.id).toStrictEqual(nextTableId);
    expect(table.id).toBe(nextTableId);
    expect(table.versionId).toBe(ids.draftTableVersionId);
    await revisionCheck(ids);
  });

  it('should rename table if the table is readonly', async () => {
    const ids = await prepareBranch(prismaService);
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

    await runTransaction(command);

    const { schemaRow, table } = await getSchemaRowAndTable(ids);

    expect(schemaRow.id).toStrictEqual(nextTableId);
    expect(table.id).toBe(nextTableId);
    expect(table.versionId).not.toBe(ids.draftTableVersionId);
    await revisionCheck(ids);
  });

  async function revisionCheck(ids: PrepareBranchReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  }

  async function getSchemaRowAndTable(ids: PrepareBranchReturnType) {
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
