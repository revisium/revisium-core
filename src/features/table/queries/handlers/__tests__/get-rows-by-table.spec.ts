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
import { GetRowsByTableQuery } from 'src/features/table/queries/impl/get-rows-by-table.query';
import { GetTableRowsReturnType } from 'src/features/table/queries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRowsByTable', () => {
  it('should sort by id', async () => {
    const context = await prepareContext();

    await setRowIds(context, ['A', 'B']);

    const asc = await querySortedRows(context, [{ id: 'asc' }]);
    expect(asc.edges.map((e) => e.node.id)).toEqual(['A', 'B']);

    const desc = await querySortedRows(context, [{ id: 'desc' }]);
    expect(desc.edges.map((e) => e.node.id)).toEqual(['B', 'A']);
  });

  it('should sort by createdAt', async () => {
    const ctx = await prepareContext();

    const row1 = await createRow(ctx);
    await delay();
    const row2 = await createRow(ctx);

    const result = await querySortedRows(ctx, [{ createdAt: 'asc' }]);
    expect(result.edges.map((e) => e.node.id)).toEqual([
      row1.rowId,
      row2.rowId,
    ]);
  });

  it('should sort by updatedAt', async () => {
    const ctx = await prepareContext();

    const row1 = await createRow(ctx);
    await delay();
    await prismaService.row.update({
      where: { versionId: row1.draftRowVersionId },
      data: {},
    });

    const result = await querySortedRows(ctx, [{ updatedAt: 'desc' }]);
    expect(result.edges[0].node.id).toBe(row1.rowId);
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

    expect((result.edges[0].node.data as typeof data).file.url).toBeTruthy();
  });

  async function prepareContext() {
    const ctx = await prepareProject(prismaService);

    await prismaService.row.deleteMany({
      where: {
        versionId: ctx.draftRowVersionId,
      },
    });

    return {
      ...ctx,
      async baseQuery(orderBy: Prisma.RowOrderByWithRelationInput[]) {
        return runTransaction(
          new GetRowsByTableQuery({
            revisionId: ctx.draftRevisionId,
            tableId: ctx.tableId,
            tableVersionId: ctx.draftTableVersionId,
            first: 100,
            orderBy,
          }),
        );
      },
    };
  }

  async function setRowIds(
    ctx: Awaited<ReturnType<typeof prepareContext>>,
    ids: string[],
  ) {
    const row1 = await createRow(ctx);
    const row2 = await createRow(ctx);

    await prismaService.row.update({
      where: { versionId: row1.draftRowVersionId },
      data: { id: ids[0] },
    });

    await prismaService.row.update({
      where: { versionId: row2.draftRowVersionId },
      data: { id: ids[1] },
    });
  }

  async function createRow(ctx: Awaited<ReturnType<typeof prepareContext>>) {
    return prepareRow({
      prismaService,
      draftTableVersionId: ctx.draftTableVersionId,
      headTableVersionId: ctx.headTableVersionId,
      data: {},
      dataDraft: {},
      schema: testSchema,
    });
  }

  async function querySortedRows(
    ctx: Awaited<ReturnType<typeof prepareContext>>,
    orderBy: Prisma.RowOrderByWithRelationInput[],
  ) {
    return ctx.baseQuery(orderBy);
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
