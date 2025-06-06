import { QueryBus } from '@nestjs/cqrs';
import {
  createPreviousFile,
  prepareProject,
  prepareTableAndRowWithFile,
} from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/file.plugin';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { GetRowsQuery } from 'src/features/row/queries/impl';
import { GetRowsReturnType } from 'src/features/row/queries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRows', () => {
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

  function runTransaction(query: GetRowsQuery): Promise<GetRowsReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
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
