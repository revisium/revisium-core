import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import objectHash from 'object-hash';

describe('InternalUpdateRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unrealRow',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Row "unrealRow" not found in table',
    );
  });

  it('should update the row if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      rowCreatedId,
    } = await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const previousRow = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.previousRowVersionId,
      },
    });
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });
    expect(row.data).toStrictEqual({ ver: 3 });
    expect(row.meta).toStrictEqual({});
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);

    expect(result.previousTableVersionId).toStrictEqual(result.tableVersionId);
    expect(previousRow.versionId).toStrictEqual(row.versionId);
    expect(previousRow.createdAt).toStrictEqual(row.createdAt);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(previousRow.publishedAt).toStrictEqual(row.publishedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);
  });

  it('should update the meta field', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      rowCreatedId,
    } = await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      meta: { meta: 2 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(row.data).toStrictEqual({ ver: 3 });
    expect(row.meta).toStrictEqual({ meta: 2 });
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);
  });

  it('should update the publishedAt field', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      rowCreatedId,
    } = await prepareProject(prismaService);

    const newPublishedAt = '2025-09-22T05:59:51.079Z';

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      publishedAt: newPublishedAt,
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(row.data).toStrictEqual({ ver: 3 });
    expect(row.publishedAt).toStrictEqual(new Date(newPublishedAt));
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);
  });

  it('should update the row in a new created table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      rowCreatedId,
    } = await prepareProject(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);

    const previousTable = await prismaService.table.findUniqueOrThrow({
      where: { versionId: result.previousTableVersionId },
    });
    const draftTable = await prismaService.table.findUniqueOrThrow({
      where: { versionId: result.tableVersionId },
    });
    const previousRow = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.previousRowVersionId,
      },
    });
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });
    expect(row.createdId).toBe(rowCreatedId);

    expect(previousRow.versionId).not.toStrictEqual(row.versionId);
    expect(previousRow.createdAt).toStrictEqual(row.createdAt);
    expect(previousRow.publishedAt).toStrictEqual(row.publishedAt);
    expect(previousRow.updatedAt).not.toStrictEqual(row.updatedAt);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);

    expect(result.previousTableVersionId).not.toStrictEqual(
      result.tableVersionId,
    );
    expect(previousTable.createdAt).toStrictEqual(draftTable.createdAt);
    expect(draftTable.createdAt).not.toStrictEqual(draftTable.updatedAt);
  });

  it('should update a new created row in the table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareProject(prismaService);
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);

    const previousRow = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.previousRowVersionId,
      },
    });
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });
    expect(previousRow.versionId).not.toStrictEqual(row.versionId);
    expect(previousRow.createdAt).toStrictEqual(row.createdAt);
    expect(previousRow.publishedAt).toStrictEqual(row.createdAt);
    expect(previousRow.updatedAt).not.toStrictEqual(row.updatedAt);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(row.publishedAt).not.toStrictEqual(row.updatedAt);
  });

  function runTransaction(
    command: InternalUpdateRowCommand,
  ): Promise<InternalUpdateRowCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
