import { CommandBus } from '@nestjs/cqrs';
import objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { InternalUpdateRowsCommand } from 'src/features/draft/commands/impl/transactional/internal-update-rows.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';

describe('UpdateRowsHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, rowId } = await prepareProject(prismaService);

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the data is not valid', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { unrealKey: 3 },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'missing required property "ver"',
    );
  });

  it('should update the row if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      draftTableVersionId,
      rowId,
      rowCreatedId,
    } = await prepareProject(prismaService);

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await runTransaction(command);

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
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);
  });

  it('should update the rows if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      draftTableVersionId,
      rowId,
      draftRowVersionId,
      rowCreatedId,
    } = await prepareProject(prismaService);

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await runTransaction(command);

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
    expect(row.versionId).toBe(draftRowVersionId);
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(row.publishedAt).toStrictEqual(row.createdAt);
  });

  it('should update the rows in a new created table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      draftTableVersionId,
      rowId,
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

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await runTransaction(command);

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
    expect(row.data).toStrictEqual({ ver: 3 });
    expect(row.versionId).toBe(draftRowVersionId);
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);
    expect(table.versionId).not.toBe(draftTableVersionId);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(row.publishedAt).toStrictEqual(row.createdAt);
  });

  it('should update a new created row in the table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      draftTableVersionId,
      rowId,
      draftRowVersionId,
    } = await prepareProject(prismaService);
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
        meta: { previousValue: 1 },
      },
    });

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await runTransaction(command);

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
    expect(row.data).toStrictEqual({ ver: 3 });
    expect(row.meta).toStrictEqual({ previousValue: 1 });
    expect(row.versionId).not.toBe(draftRowVersionId);
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(table.versionId).toBe(draftTableVersionId);
    expect(row.createdAt).not.toStrictEqual(row.updatedAt);
    expect(row.publishedAt).toStrictEqual(row.createdAt);
  });

  function runTransaction(command: InternalUpdateRowsCommand): Promise<void> {
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
