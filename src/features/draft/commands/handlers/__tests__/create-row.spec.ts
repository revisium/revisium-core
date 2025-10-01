import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';
import * as objectHash from 'object-hash';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';

describe('CreateRowHandler', () => {
  it('should throw an error if the rowId is shorter than 1 character', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: '',
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Row ID must be 1 to ',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new CreateRowCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      rowId: 'rowId',
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar row already exists', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name already exists in the table',
    );
  });

  it('should throw an error if the data is not valid', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      data: { ver: '3' },
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, rowId } = await prepareProject(prismaService);

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId: rowId,
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should create a new row if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
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
    await revisionCheck(ids);
  });

  it('should create a new row in a new created table if conditions are met', async () => {
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

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
    });

    const result = await runTransaction(command);

    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.rowVersionId).toBeTruthy();
    await revisionCheck(ids);
  });

  it('should create a new row with refs', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      headRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = ids;

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const file = {
      status: '',
      fileId: '',
      url: '',
      fileName: '',
      hash: '',
      extension: '',
      mimeType: '',
      size: 0,
      width: 0,
      height: 0,
    };

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: 'newRowId',
      data: { file, files: [file, file, file] },
    });

    await runTransaction(command);
  });

  it('should save provided publishedAt value when creating a row', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      headRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = ids;

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        ver: {
          type: JsonSchemaTypeName.Number,
          default: 1,
        },
        myPublishedAtField: getRefSchema(SystemSchemaIds.RowPublishedAt),
      }),
    });

    const publishedAtDate = new Date('2027-01-01T00:00:00.000Z');
    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: 'NewRowId',
      data: { ver: 5, myPublishedAtField: publishedAtDate.toISOString() },
    });

    const result = await runTransaction(command);

    const createdRow = await prismaService.row.findFirstOrThrow({
      where: { versionId: result.rowVersionId },
    });

    expect(createdRow.publishedAt).not.toStrictEqual(createdRow.createdAt);
    expect(createdRow.publishedAt).toStrictEqual(publishedAtDate);
  });

  it('should use default date (now) as publishedAt when publishedAt is empty', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      headRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = ids;

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        ver: {
          type: JsonSchemaTypeName.Number,
          default: 1,
        },
        myPublishedAtField: getRefSchema(SystemSchemaIds.RowPublishedAt),
      }),
    });

    const command = new CreateRowCommand({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: 'NewRowId',
      data: { ver: 5, myPublishedAtField: '' },
    });

    const result = await runTransaction(command);

    const createdRow = await prismaService.row.findFirstOrThrow({
      where: { versionId: result.rowVersionId },
    });

    expect(createdRow.publishedAt).toStrictEqual(createdRow.createdAt);
  });

  async function revisionCheck(ids: PrepareProjectReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  }

  async function rowCheck(
    ids: PrepareProjectReturnType,
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
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBeTruthy();
    expect(row.createdId).not.toBe(row.id);
    expect(row.createdId).not.toBe(row.versionId);
    expect(row.createdAt).toStrictEqual(row.updatedAt);
    expect(row.publishedAt).toStrictEqual(row.createdAt);
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
