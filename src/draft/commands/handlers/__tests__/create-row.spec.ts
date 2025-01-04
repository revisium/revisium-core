import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
  prepareBranch,
  PrepareBranchReturnType,
} from 'src/draft/commands/handlers/__tests__/utils';
import { CreateRowCommand } from 'src/draft/commands/impl/create-row.command';
import { CreateRowHandlerReturnType } from 'src/draft/commands/types/create-row.handler.types';
import { DraftTransactionalCommands } from 'src/draft/draft.transactional.commands';
import { SystemTables } from 'src/share/system-tables.consts';

describe('CreateRowHandler', () => {
  it('should throw an error if the rowId is shorter than 1 character', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: '',
      data: { test: 'value' },
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'The length of the row name must be greater than or equal to 1',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareBranch(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new CreateRowCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      rowId: 'rowId',
      data: { test: 'value' },
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar row already exists', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareBranch(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      data: { test: 'value' },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name already exists in the table',
    );
  });

  it('should throw an error if the data is not valid', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareBranch(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      data: { test: 1 },
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, rowId } = await prepareBranch(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId: rowId,
      data: { test: 'value' },
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should create a new row if conditions are met', async () => {
    const ids = await prepareBranch(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { test: 'value' },
    });

    const result = await runTransaction(command);

    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.rowVersionId).toBeTruthy();

    await rowCheck(
      ids,
      command.data.rowId,
      result.rowVersionId,
      command.data.data,
    );
    await changelogCheck(ids, command.data.rowId);
  });

  it('should create a new row if conditions are met if the table is a system table and skipCheckingNotSystemTable = true', async () => {
    const ids = await prepareBranch(prismaService);
    const { draftRevisionId } = ids;

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      skipCheckingNotSystemTable: true,
      rowId: 'newRowId',
      data: {
        type: 'object',
        required: ['test'],
        properties: {
          test: {
            type: 'string',
            default: '',
          },
        },
        additionalProperties: false,
      },
    });

    const result = await runTransaction(command);

    expect(result).toBeTruthy();
  });

  it('should create a new row in a new created table if conditions are met', async () => {
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

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { test: 'value' },
    });

    const result = await runTransaction(command);

    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.rowVersionId).toBeTruthy();
  });

  async function rowCheck(
    ids: PrepareBranchReturnType,
    rowId: string,
    createdRowVersionId: string,
    data: Prisma.InputJsonValue,
  ) {
    const { draftRevisionId, tableId } = ids;

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: rowId,
        tables: {
          some: {
            id: tableId,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row.id).toBe(rowId);
    expect(row.versionId).toBe(createdRowVersionId);
    expect(row.data).toStrictEqual(data);
    expect(row.readonly).toBe(false);
  }

  async function changelogCheck(ids: PrepareBranchReturnType, rowId: string) {
    const { draftChangelogId, tableId } = ids;

    const changelog = await prismaService.changelog.findFirstOrThrow({
      where: {
        id: draftChangelogId,
      },
    });
    expect(changelog.hasChanges).toBe(true);
    expect(changelog.rowInsertsCount).toBe(1);
    expect(changelog.rowInserts).toStrictEqual({
      [tableId]: {
        rows: {
          [rowId]: '',
        },
      },
    });
  }

  function runTransaction(
    command: CreateRowCommand,
  ): Promise<CreateRowHandlerReturnType> {
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
