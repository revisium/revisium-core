import { QueryBus } from '@nestjs/cqrs';
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
import { GetRowsByTableQuery } from 'src/features/table/queries/impl/get-rows-by-table.query';
import { GetTableRowsReturnType } from 'src/features/table/queries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRowsByTable', () => {
  it('should sort by id', async () => {
    const {
      draftTableVersionId,
      tableId,
      draftRevisionId,
      headTableVersionId,
      draftRowVersionId,
    } = await prepareProject(prismaService);

    const anotherRow = await prepareRow({
      prismaService,
      draftTableVersionId,
      headTableVersionId,
      data: {},
      dataDraft: {},
      schema: testSchema,
    });

    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        id: 'A',
      },
    });

    await prismaService.row.update({
      where: {
        versionId: anotherRow.draftRowVersionId,
      },
      data: {
        id: 'B',
      },
    });

    const resultAsc = await runTransaction(
      new GetRowsByTableQuery({
        revisionId: draftRevisionId,
        tableId: tableId,
        tableVersionId: draftTableVersionId,
        first: 100,
        orderBy: [
          {
            id: 'asc',
          },
        ],
      }),
    );

    expect(resultAsc.totalCount).toBe(2);
    expect(resultAsc.edges[0].node.id).toBe('A');
    expect(resultAsc.edges[1].node.id).toBe('B');

    const resultDesc = await runTransaction(
      new GetRowsByTableQuery({
        revisionId: draftRevisionId,
        tableId: tableId,
        tableVersionId: draftTableVersionId,
        first: 100,
        orderBy: [
          {
            id: 'desc',
          },
        ],
      }),
    );

    expect(resultDesc.totalCount).toBe(2);
    expect(resultDesc.edges[0].node.id).toBe('B');
    expect(resultDesc.edges[1].node.id).toBe('A');
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
      new GetRowsByTableQuery({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        tableVersionId: table.draftTableVersionId,
        first: 1,
      }),
    );

    const resultData = result.edges[0].node.data as typeof data;

    expect(resultData.file.url).toBeTruthy();
  });

  function runTransaction(
    query: GetRowsByTableQuery,
  ): Promise<GetTableRowsReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    transactionService = result.transactionService;
    queryBus = result.queryBus;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
