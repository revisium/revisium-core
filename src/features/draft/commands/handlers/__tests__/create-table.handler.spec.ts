import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import objectHash from 'object-hash';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { JsonPatchAdd, InitMigration } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchemaWithRef,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { CreateTableCommand } from 'src/features/draft/commands/impl/create-table.command';
import { CreateTableHandlerReturnType } from 'src/features/draft/commands/types/create-table.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';

describe('CreateTableHandler', () => {
  it('should throw an error if the tableId is shorter than 1 character', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: '',
      schema: {},
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'It must contain between',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new CreateTableCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      schema: {},
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar table already exists', async () => {
    const { tableId, draftRevisionId } = await prepareProject(prismaService);

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
    const { draftRevisionId } = await prepareProject(prismaService);

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
    const ids = await prepareProject(prismaService);
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
    await revisionCheck(ids);
    await migrationCheck({ revisionId: draftRevisionId, tableId: 'config' });
  });

  it('should create table with ref', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, branchId } = ids;

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'config',
      schema: testSchemaWithRef,
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.revisionId).toBe(draftRevisionId);
    expect(result.tableVersionId).toBeTruthy();

    await tableCheck(ids, command.data.tableId, result.tableVersionId);
    await schemaCheck(ids, command.data.tableId, command.data.schema);
    await revisionCheck(ids);
  });

  async function tableCheck(
    ids: PrepareProjectReturnType,
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
    expect(table.createdId).toBeTruthy();
    expect(table.createdId).not.toBe(table.id);
    expect(table.createdId).not.toBe(table.versionId);
    expect(table.createdAt).not.toBe(table.updatedAt);
  }

  async function schemaCheck(
    ids: PrepareProjectReturnType,
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
    expect(schemaRow.meta).toStrictEqual([
      {
        patches: [{ op: 'add', path: '', value: schema } as JsonPatchAdd],
        hash: objectHash(schema),
        date: expect.any(String),
      },
    ]);
    expect(schemaRow.schemaHash).toBe(objectHash(metaSchema));
  }

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
  }: {
    revisionId: string;
    tableId: string;
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
    });

    expect(rows.length).toBe(1);

    const row = rows[0];
    const data = row.data as InitMigration;
    expect(row.id).toBe(data.id);
    expect(row.meta).toStrictEqual({});
    expect(row.hash).toBe(objectHash(data));
    expect(row.schemaHash).toBe(objectHash(tableMigrationsSchema));
    expect(data.schema).toStrictEqual({ type: 'string', default: '' });
    expect(data.hash).toBe(objectHash({ type: 'string', default: '' }));
    expect(data.changeType).toBe('init');
    expect(data.tableId).toBe(tableId);
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

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
