import { QueryBus } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  createPreviousFile,
  prepareProject,
  prepareRow,
  prepareTableAndRowWithFile,
} from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/file.plugin';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { GetRowsByTableQuery } from 'src/features/table/queries/impl/get-rows-by-table.query';
import { GetTableRowsReturnType } from 'src/features/table/queries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRowsByTable', () => {
  it('should sort by id', async () => {
    const context = await prepareContext();

    await setRowIds(context, ['A', 'B']);

    const asc = await querySortedRows(context, [{ id: 'asc' }]);
    expect(asc.edges.map((edge) => edge.node.id)).toEqual(['A', 'B']);

    const desc = await querySortedRows(context, [{ id: 'desc' }]);
    expect(desc.edges.map((edge) => edge.node.id)).toEqual(['B', 'A']);
  });

  describe.each([
    ['createdAt', 'asc'],
    ['createdAt', 'desc'],
    ['updatedAt', 'asc'],
    ['updatedAt', 'desc'],
  ])(
    'should sort by %s %s',
    (field: 'createdAt' | 'updatedAt', direction: 'asc' | 'desc') => {
      it('sorts rows correctly', async () => {
        const context = await prepareContext();

        const row1 = await createRow(context);
        await delay();
        const row2 = await createRow(context);

        if (field === 'updatedAt') {
          await delay();
          await prismaService.row.update({
            where: { versionId: row2.draftRowVersionId },
            data: {},
          });
        }

        const result = await querySortedRows(context, [{ [field]: direction }]);

        const sortedIds = result.edges.map((e) => e.node.id);

        const expected =
          direction === 'asc'
            ? [row1.rowId, row2.rowId]
            : [row2.rowId, row1.rowId];

        expect(sortedIds).toEqual(expected);
      });
    },
  );

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
      new GetRowsByTableQuery({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        tableVersionId: table.draftTableVersionId,
        first: 1,
      }),
    );

    expect((result.edges[0].node.data as typeof data).file.url).toBeTruthy();
  });

  describe('filtering', () => {
    it('insensitive mode', async () => {
      const {
        draftRowVersionId,
        draftRevisionId,
        tableId,
        draftTableVersionId,
      } = await prepareProject(prismaService);

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
        new GetRowsByTableQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          tableVersionId: draftTableVersionId,
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
        new GetRowsByTableQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          tableVersionId: draftTableVersionId,
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
      const {
        draftRowVersionId,
        draftRevisionId,
        tableId,
        draftTableVersionId,
      } = await prepareProject(prismaService);

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
        new GetRowsByTableQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          tableVersionId: draftTableVersionId,
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
        new GetRowsByTableQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          tableVersionId: draftTableVersionId,
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
      const {
        draftRowVersionId,
        draftRevisionId,
        tableId,
        draftTableVersionId,
      } = await prepareProject(prismaService);

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
        new GetRowsByTableQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          tableVersionId: draftTableVersionId,
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
        new GetRowsByTableQuery({
          revisionId: draftRevisionId,
          tableId: tableId,
          tableVersionId: draftTableVersionId,
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

  async function prepareContext() {
    const context = await prepareProject(prismaService);

    await prismaService.row.delete({
      where: {
        versionId: context.draftRowVersionId,
      },
    });

    return {
      ...context,
      async baseQuery(orderBy: Prisma.RowOrderByWithRelationInput[]) {
        return runTransaction(
          new GetRowsByTableQuery({
            revisionId: context.draftRevisionId,
            tableId: context.tableId,
            tableVersionId: context.draftTableVersionId,
            first: 100,
            orderBy,
          }),
        );
      },
    };
  }

  async function setRowIds(
    context: Awaited<ReturnType<typeof prepareContext>>,
    ids: string[],
  ) {
    const row1 = await createRow(context);
    const row2 = await createRow(context);

    await prismaService.row.update({
      where: { versionId: row1.draftRowVersionId },
      data: { id: ids[0] },
    });

    await prismaService.row.update({
      where: { versionId: row2.draftRowVersionId },
      data: { id: ids[1] },
    });
  }

  async function createRow(
    context: Awaited<ReturnType<typeof prepareContext>>,
  ) {
    return prepareRow({
      prismaService,
      draftTableVersionId: context.draftTableVersionId,
      headTableVersionId: context.headTableVersionId,
      data: {},
      dataDraft: {},
      schema: testSchema,
    });
  }

  async function querySortedRows(
    context: Awaited<ReturnType<typeof prepareContext>>,
    orderBy: Prisma.RowOrderByWithRelationInput[],
  ) {
    return context.baseQuery(orderBy);
  }

  async function delay(ms = 10) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function runTransaction(
    query: GetRowsByTableQuery,
  ): Promise<GetTableRowsReturnType> {
    return transactionService.run(() => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let pluginListService: PluginListService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginListService = result.pluginListService;
    transactionService = result.transactionService;
    queryBus = result.queryBus;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
