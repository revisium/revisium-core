import { Prisma } from 'src/__generated__/client';
import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import objectHash from 'object-hash';

describe('InternalCreateRowHandler', () => {
  it('should throw an error if the rowId is shorter than 1 character', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: '',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'The length of the row name must be greater than or equal to 1',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new InternalCreateRowCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      rowId: 'rowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar row already exists', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name already exists in the table',
    );
  });

  it('should create a new row if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
      meta: { meta: 1 },
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
      { meta: 1 },
    );
  });

  it('should save the optional meta field', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
      meta: { meta: 1 },
      schemaHash: objectHash(testSchema),
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
      { meta: 1 },
    );
  });

  it('should save the optional publishedAt field', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

    const publishedAtDate = new Date('2027-01-01T00:00:00.000Z');

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
      meta: { meta: 1 },
      publishedAt: publishedAtDate.toISOString(),
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
      { meta: 1 },
      publishedAtDate,
    );
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

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.rowVersionId).toBeTruthy();
  });

  async function rowCheck(
    ids: PrepareProjectReturnType,
    rowId: string,
    createdRowVersionId: string,
    data: Prisma.InputJsonValue,
    meta: Prisma.InputJsonValue,
    publishedAt?: Date,
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
    expect(row.meta).toStrictEqual(meta);
    expect(row.readonly).toBe(false);
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBeTruthy();
    expect(row.createdId).not.toBe(row.id);
    expect(row.createdId).not.toBe(row.versionId);
    expect(row.createdAt).toStrictEqual(row.updatedAt);

    const expectedPublishedAt = publishedAt ?? row.createdAt;
    expect(row.publishedAt).toStrictEqual(expectedPublishedAt);
  }

  function runTransaction(
    command: InternalCreateRowCommand,
  ): Promise<InternalCreateRowCommandReturnType> {
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
