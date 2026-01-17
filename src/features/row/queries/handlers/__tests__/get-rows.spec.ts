import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { getObjectSchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { nanoid } from 'nanoid';
import {
  createPreviousFile,
  prepareBranch,
  prepareProject,
  prepareRow,
  prepareTableAndRowWithFile,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import { FormulaService } from 'src/features/plugin/formula';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { CreateTableCommand } from 'src/features/draft/commands/impl/create-table.command';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import {
  GetRowsQuery,
  GetRowsQueryReturnType,
} from 'src/features/row/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRows', () => {
  it('should sort by json field', async () => {
    const { draftRowVersionId, draftRevisionId, tableId, draftTableVersionId } =
      await prepareProject(prismaService);

    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        data: {
          ver: 10,
        },
      },
    });
    await prismaService.row.create({
      data: {
        tables: {
          connect: {
            versionId: draftTableVersionId,
          },
        },
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
        hash: '',
        schemaHash: '',
        data: {
          ver: 8,
        },
      },
    });
    await prismaService.row.create({
      data: {
        tables: {
          connect: {
            versionId: draftTableVersionId,
          },
        },
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
        hash: '',
        schemaHash: '',
        data: {
          ver: 14,
        },
      },
    });

    const result = await runTransaction(
      new GetRowsQuery({
        revisionId: draftRevisionId,
        tableId,
        first: 10,
        orderBy: [
          {
            data: {
              path: 'ver',
              type: 'int',
              direction: 'asc',
            },
          },
        ],
      }),
    );

    expect(result.totalCount).toEqual(3);
    expect(
      result.edges.map((edge) => (edge.node.data as any).ver),
    ).toStrictEqual([8, 10, 14]);
  });

  it('should compute rows', async () => {
    const data = {
      file: {
        ...createPreviousFile(),
        status: FileStatus.uploaded,
        url: '',
      },
      files: [],
    };

    const { draftRevisionId, table } = await prepareTableAndRowWithFile(
      prismaService,
      data,
    );

    const result = await runTransaction(
      new GetRowsQuery({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        first: 1,
      }),
    );

    const resultData = result.edges[0].node.data as typeof data;

    expect(resultData.file.url).toBeTruthy();
  });

  describe('filtering', () => {
    it('should calculate totalCount', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['ver'],
              equals: 2,
            },
          },
        }),
      );

      expect(result.edges.length).toEqual(1);
      expect(result.totalCount).toEqual(1);

      const filteredResult = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['ver'],
              equals: 3,
            },
          },
        }),
      );

      expect(filteredResult.edges.length).toEqual(0);
      expect(filteredResult.totalCount).toEqual(0);
    });

    it('insensitive mode', async () => {
      const { draftRowVersionId, draftRevisionId, tableId } =
        await prepareProject(prismaService);

      // @ts-ignore
      pluginListService['orderedPlugins'] = [];

      await prismaService.row.update({
        where: {
          versionId: draftRowVersionId,
        },
        data: {
          data: {
            test: 'Test',
          },
        },
      });

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['test'],
              string_contains: 'tEST',
              mode: 'default',
            },
          },
        }),
      );

      expect(result.edges.length).toEqual(0);

      const resultInsensitive = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['test'],
              string_contains: 'tEST',
              mode: 'insensitive',
            },
          },
        }),
      );

      expect(resultInsensitive.edges.length).toEqual(1);
    });

    it('insensitive mode non latin', async () => {
      const { draftRowVersionId, draftRevisionId, tableId } =
        await prepareProject(prismaService);

      // @ts-ignore
      pluginListService['orderedPlugins'] = [];

      await prismaService.row.update({
        where: {
          versionId: draftRowVersionId,
        },
        data: {
          data: {
            test: 'Тест',
          },
        },
      });

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['test'],
              string_contains: 'тЕСТ',
              mode: 'default',
            },
          },
        }),
      );

      expect(result.edges.length).toEqual(0);

      const resultInsensitive = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['test'],
              string_contains: 'тЕСТ',
              mode: 'insensitive',
            },
          },
        }),
      );

      expect(resultInsensitive.edges.length).toEqual(1);
    });

    it('nested insensitive mode', async () => {
      const { draftRowVersionId, draftRevisionId, tableId } =
        await prepareProject(prismaService);

      // @ts-ignore
      pluginListService['orderedPlugins'] = [];

      await prismaService.row.update({
        where: {
          versionId: draftRowVersionId,
        },
        data: {
          data: {
            nested: {
              subNested: {
                test: 'Test',
              },
            },
          },
        },
      });

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['nested', 'subNested', 'test'],
              string_contains: 'tEST',
              mode: 'default',
            },
          },
        }),
      );

      expect(result.edges.length).toEqual(0);

      const resultInsensitive = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          first: 100,
          where: {
            data: {
              path: ['nested', 'subNested', 'test'],
              string_contains: 'tEST',
              mode: 'insensitive',
            },
          },
        }),
      );

      expect(resultInsensitive.edges.length).toEqual(1);
    });
  });

  describe('field mapping', () => {
    it('should filter by system column when schema field has $ref to RowCreatedAt', async () => {
      const {
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
      } = await prepareBranch(prismaService);

      const schemaWithSystemRef = getObjectSchema({
        createdAtField: getRefSchema(SystemSchemaIds.RowCreatedAt),
      });

      const table = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: schemaWithSystemRef,
      });

      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24);

      await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        data: { createdAtField: '' },
        dataDraft: { createdAtField: '' },
        schema: schemaWithSystemRef,
      });

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          first: 100,
          where: {
            data: {
              path: ['createdAtField'],
              gte: pastDate.toISOString(),
            },
          },
        }),
      );

      expect(result.edges.length).toEqual(1);

      const futureResult = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          first: 100,
          where: {
            data: {
              path: ['createdAtField'],
              gte: futureDate.toISOString(),
            },
          },
        }),
      );

      expect(futureResult.edges.length).toEqual(0);
    });

    it('should sort by system column when schema field has $ref to RowCreatedAt', async () => {
      const {
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
      } = await prepareBranch(prismaService);

      const schemaWithSystemRef = getObjectSchema({
        createdAtField: getRefSchema(SystemSchemaIds.RowCreatedAt),
      });

      const table = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: schemaWithSystemRef,
      });

      const row1VersionId = nanoid();
      const row2VersionId = nanoid();
      const row3VersionId = nanoid();

      const now = new Date();
      const date1 = new Date(now.getTime() - 3000);
      const date2 = new Date(now.getTime() - 2000);
      const date3 = new Date(now.getTime() - 1000);

      await prismaService.row.create({
        data: {
          tables: { connect: { versionId: table.draftTableVersionId } },
          id: 'row-1',
          versionId: row1VersionId,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          data: { createdAtField: '' },
          createdAt: date1,
        },
      });

      await prismaService.row.create({
        data: {
          tables: { connect: { versionId: table.draftTableVersionId } },
          id: 'row-2',
          versionId: row2VersionId,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          data: { createdAtField: '' },
          createdAt: date2,
        },
      });

      await prismaService.row.create({
        data: {
          tables: { connect: { versionId: table.draftTableVersionId } },
          id: 'row-3',
          versionId: row3VersionId,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          data: { createdAtField: '' },
          createdAt: date3,
        },
      });

      const resultAsc = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          first: 100,
          orderBy: [
            {
              data: {
                path: ['createdAtField'],
                direction: 'asc',
              },
            },
          ],
        }),
      );

      expect(resultAsc.edges.map((e) => e.node.id)).toEqual([
        'row-1',
        'row-2',
        'row-3',
      ]);

      const resultDesc = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          first: 100,
          orderBy: [
            {
              data: {
                path: ['createdAtField'],
                direction: 'desc',
              },
            },
          ],
        }),
      );

      expect(resultDesc.edges.map((e) => e.node.id)).toEqual([
        'row-3',
        'row-2',
        'row-1',
      ]);
    });

    it('should filter by system column when schema field has $ref to RowId', async () => {
      const {
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
      } = await prepareBranch(prismaService);

      const schemaWithSystemRef = getObjectSchema({
        rowIdField: getRefSchema(SystemSchemaIds.RowId),
      });

      const table = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: schemaWithSystemRef,
      });

      await prismaService.row.create({
        data: {
          tables: { connect: { versionId: table.draftTableVersionId } },
          id: 'test-row-id',
          versionId: nanoid(),
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          data: { rowIdField: '' },
        },
      });

      await prismaService.row.create({
        data: {
          tables: { connect: { versionId: table.draftTableVersionId } },
          id: 'another-row-id',
          versionId: nanoid(),
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          data: { rowIdField: '' },
        },
      });

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          first: 100,
          where: {
            data: {
              path: ['rowIdField'],
              equals: 'test-row-id',
            },
          },
        }),
      );

      expect(result.edges.length).toEqual(1);
      expect(result.edges[0].node.id).toEqual('test-row-id');
    });
  });

  describe('formula computation', () => {
    beforeEach(() => {
      Object.defineProperty(formulaService, 'isAvailable', { value: true });
    });

    it('should compute formulas for rows', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      await transactionService.run(async () =>
        commandBus.execute(
          new CreateTableCommand({
            revisionId: draftRevisionId,
            tableId: 'products',
            schema: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                quantity: { type: 'number', default: 1 },
                total: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
              },
              additionalProperties: false,
              required: ['price', 'quantity', 'total'],
            },
          }),
        ),
      );

      await transactionService.run(async () =>
        draftRevisionApiService.createRows({
          revisionId: draftRevisionId,
          tableId: 'products',
          rows: [
            { rowId: 'row1', data: { price: 10, quantity: 3, total: 0 } },
            { rowId: 'row2', data: { price: 20, quantity: 5, total: 0 } },
          ],
        }),
      );

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: 'products',
          first: 10,
        }),
      );

      expect(result.edges).toHaveLength(2);
      const row1 = result.edges.find((e) => e.node.id === 'row1');
      const row2 = result.edges.find((e) => e.node.id === 'row2');

      expect((row1?.node.data as { total: number }).total).toBe(30);
      expect((row2?.node.data as { total: number }).total).toBe(100);
      expect(row1?.node.formulaErrors).toBeUndefined();
      expect(row2?.node.formulaErrors).toBeUndefined();
    });

    it('should return formulaErrors when formula fails', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      await transactionService.run(async () =>
        commandBus.execute(
          new CreateTableCommand({
            revisionId: draftRevisionId,
            tableId: 'products',
            schema: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                quantity: { type: 'number', default: 1 },
                total: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
                settings: {
                  type: 'object',
                  properties: {
                    display: {
                      type: 'object',
                      properties: {
                        scale: { type: 'number', default: 1 },
                      },
                      additionalProperties: false,
                      required: ['scale'],
                    },
                  },
                  additionalProperties: false,
                  required: [],
                },
                scaled: {
                  type: 'number',
                  default: -1,
                  readOnly: true,
                  'x-formula': {
                    version: 1,
                    expression: 'settings.display.scale',
                  },
                },
              },
              additionalProperties: false,
              required: ['price', 'quantity', 'total', 'settings', 'scaled'],
            },
          }),
        ),
      );

      await transactionService.run(async () =>
        draftRevisionApiService.createRows({
          revisionId: draftRevisionId,
          tableId: 'products',
          rows: [
            {
              rowId: 'row1',
              data: {
                price: 10,
                quantity: 3,
                total: 0,
                settings: {},
                scaled: -1,
              },
            },
            {
              rowId: 'row2',
              data: {
                price: 20,
                quantity: 5,
                total: 0,
                settings: {},
                scaled: -1,
              },
            },
          ],
        }),
      );

      const result = await runTransaction(
        new GetRowsQuery({
          revisionId: draftRevisionId,
          tableId: 'products',
          first: 10,
        }),
      );

      expect(result.edges).toHaveLength(2);
      const row1 = result.edges.find((e) => e.node.id === 'row1');
      const row2 = result.edges.find((e) => e.node.id === 'row2');

      expect((row1?.node.data as { total: number }).total).toBe(30);
      expect((row1?.node.data as { scaled: number }).scaled).toBe(0);
      expect(row1?.node.formulaErrors).toBeDefined();
      expect(row1?.node.formulaErrors).toHaveLength(1);
      expect(row1?.node.formulaErrors?.[0].field).toBe('scaled');

      expect((row2?.node.data as { total: number }).total).toBe(100);
      expect((row2?.node.data as { scaled: number }).scaled).toBe(0);
      expect(row2?.node.formulaErrors).toBeDefined();
      expect(row2?.node.formulaErrors).toHaveLength(1);
      expect(row2?.node.formulaErrors?.[0].field).toBe('scaled');
      expect(row2?.node.formulaErrors?.[0].expression).toBe(
        'settings.display.scale',
      );
      expect(row2?.node.formulaErrors?.[0].defaultUsed).toBe(true);
    });
  });

  function runTransaction(
    query: GetRowsQuery,
  ): Promise<GetRowsQueryReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let pluginListService: PluginListService;
  let originalOrderedPlugins: unknown[];
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;
  let commandBus: CommandBus;
  let formulaService: FormulaService;
  let draftRevisionApiService: DraftRevisionApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginListService = result.pluginListService;
    originalOrderedPlugins = [...pluginListService['orderedPlugins']];
    transactionService = result.transactionService;
    queryBus = result.queryBus;
    commandBus = result.commandBus;
    formulaService = result.module.get<FormulaService>(FormulaService);
    draftRevisionApiService = result.module.get<DraftRevisionApiService>(
      DraftRevisionApiService,
    );
  });

  afterEach(() => {
    // @ts-ignore
    pluginListService['orderedPlugins'] = originalOrderedPlugins;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
