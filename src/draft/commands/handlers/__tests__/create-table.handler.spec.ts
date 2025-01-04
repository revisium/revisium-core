import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
  prepareBranch,
  PrepareBranchReturnType,
} from 'src/draft/commands/handlers/__tests__/utils';
import { CreateTableCommand } from 'src/draft/commands/impl/create-table.command';
import { CreateTableHandlerReturnType } from 'src/draft/commands/types/create-table.handler.types';
import { DraftTransactionalCommands } from 'src/draft/draft.transactional.commands';
import { SystemTables } from 'src/share/system-tables.consts';

describe('CreateTableHandler', () => {
  it('should throw an error if the tableId is shorter than 1 character', async () => {
    const { draftRevisionId } = await prepareBranch(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: '',
      schema: {},
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'The length of the table name must be greater than or equal to 1',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareBranch(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new CreateTableCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      schema: {},
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar table already exists', async () => {
    const { tableId, draftRevisionId } = await prepareBranch(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      schema: {},
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A table with this name already exists in the revision',
    );
  });

  it('should throw an error if the schema is invalid', async () => {
    const { draftRevisionId } = await prepareBranch(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'tableId',
      schema: { type: 'invalidType' },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'this type is not allowed',
    );
  });

  it('should create a new table if conditions are met', async () => {
    const ids = await prepareBranch(prismaService);
    const { draftRevisionId, branchId } = ids;

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'config',
      schema: { type: 'string', default: '' },
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.revisionId).toBe(draftRevisionId);
    expect(result.tableVersionId).toBeTruthy();

    await tableCheck(ids, command.data.tableId, result.tableVersionId);
    await schemaCheck(ids, command.data.tableId, command.data.schema);
    await changelogCheck(ids, command.data.tableId);
  });

  async function tableCheck(
    ids: PrepareBranchReturnType,
    tableId: string,
    tableVersionId: string,
  ) {
    const { draftRevisionId } = ids;

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        id: tableId,
        revisions: {
          some: {
            id: draftRevisionId,
          },
        },
      },
    });
    expect(table.id).toBe(tableId);
    expect(table.versionId).toBe(tableVersionId);
    expect(table.readonly).toBe(false);
  }

  async function schemaCheck(
    ids: PrepareBranchReturnType,
    tableId: string,
    schema: Prisma.InputJsonValue,
  ) {
    const { draftRevisionId } = ids;

    const schemaRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(schemaRow.id).toBe(tableId);
    expect(schemaRow.data).toStrictEqual(schema);
  }

  async function changelogCheck(ids: PrepareBranchReturnType, tableId: string) {
    const { draftChangelogId } = ids;

    const changelog = await prismaService.changelog.findFirstOrThrow({
      where: {
        id: draftChangelogId,
      },
    });
    expect(changelog.hasChanges).toBe(true);
    expect(changelog.tableInsertsCount).toBe(1);
    expect(changelog.tableUpdatesCount).toBe(1);
    expect(changelog.tableInserts).toStrictEqual({
      [tableId]: '',
    });
    expect(changelog.tableUpdates).toStrictEqual({
      [SystemTables.Schema]: '',
    });
    expect(changelog.rowInsertsCount).toStrictEqual(1);
    expect(changelog.rowInserts).toStrictEqual({
      [SystemTables.Schema]: {
        rows: {
          [tableId]: '',
        },
      },
    });
  }

  function runTransaction(
    command: CreateTableCommand,
  ): Promise<CreateTableHandlerReturnType> {
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
