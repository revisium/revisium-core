import { Test } from '@nestjs/testing';
import { OrderByConditions } from '@revisium/prisma-pg-json';
import { nanoid } from 'nanoid';
import { getKeysetPagination } from 'src/features/row/utils/get-keyset-pagination';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const ROW_COUNT = 15000;
const PAGE_SIZE = 100;

const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('keyset pagination - large dataset (15K rows)', () => {
  let prisma: PrismaService;
  let tableVersionId: string;
  let allRowIds: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prisma = module.get(PrismaService);
  });

  beforeAll(async () => {
    const table = await prisma.table.create({
      data: {
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
      },
    });

    tableVersionId = table.versionId;

    const baseDate = new Date('2024-01-01T00:00:00.000Z');
    const batchSize = 1000;

    allRowIds = [];
    const allVersionIds: string[] = [];

    for (let batch = 0; batch < ROW_COUNT / batchSize; batch++) {
      const rows = Array.from({ length: batchSize }, (_, i) => {
        const index = batch * batchSize + i;
        const rowId = `row-${String(index).padStart(5, '0')}`;
        const versionId = nanoid();
        allRowIds.push(rowId);
        allVersionIds.push(versionId);
        return {
          id: rowId,
          versionId,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            priority: index % 100,
            category: `cat-${index % 50}`,
            score: Math.round(Math.random() * 1000),
          },
          createdAt: new Date(baseDate.getTime() + index * 1000),
        };
      });

      await prisma.row.createMany({ data: rows });
    }

    for (let batch = 0; batch < allVersionIds.length; batch += batchSize) {
      const batchIds = allVersionIds.slice(batch, batch + batchSize);
      await Promise.all(
        batchIds.map((vId) =>
          prisma.row.update({
            where: { versionId: vId },
            data: { tables: { connect: { versionId: tableVersionId } } },
          }),
        ),
      );
    }
  }, 120000);

  describe('full traversal', () => {
    it('should visit all rows exactly once with default sort', async () => {
      const collected: string[] = [];
      let cursor: string | undefined;

      while (true) {
        const result = await getKeysetPagination({
          pageData: { first: PAGE_SIZE, after: cursor },
          tableVersionId,
          queryRaw: (sql) => prisma.$queryRaw(sql),
          transformRows: async (rows) => rows,
        });

        collected.push(...result.edges.map((e) => e.node.id));

        if (!result.pageInfo.hasNextPage) {
          break;
        }
        cursor = result.pageInfo.endCursor;
      }

      expect(collected).toHaveLength(ROW_COUNT);
      expect(new Set(collected).size).toBe(ROW_COUNT);
    }, 60000);

    it('should visit all rows exactly once with createdAt ASC', async () => {
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];
      const collected: string[] = [];
      let cursor: string | undefined;

      while (true) {
        const result = await getKeysetPagination({
          pageData: { first: PAGE_SIZE, after: cursor },
          tableVersionId,
          orderBy,
          queryRaw: (sql) => prisma.$queryRaw(sql),
          transformRows: async (rows) => rows,
        });

        collected.push(...result.edges.map((e) => e.node.id));

        if (!result.pageInfo.hasNextPage) {
          break;
        }
        cursor = result.pageInfo.endCursor;
      }

      expect(collected).toHaveLength(ROW_COUNT);
      expect(new Set(collected).size).toBe(ROW_COUNT);
      expect(collected).toEqual([...collected].sort());
    }, 60000);

    it('should visit all rows exactly once with JSON field sort', async () => {
      const orderBy: OrderByConditions[] = [
        {
          data: {
            path: 'priority',
            type: 'int',
            direction: 'asc',
          },
        },
      ];
      const collected: string[] = [];
      let cursor: string | undefined;

      while (true) {
        const result = await getKeysetPagination({
          pageData: { first: PAGE_SIZE, after: cursor },
          tableVersionId,
          orderBy,
          queryRaw: (sql) => prisma.$queryRaw(sql),
          transformRows: async (rows) => rows,
        });

        collected.push(...result.edges.map((e) => e.node.id));

        if (!result.pageInfo.hasNextPage) {
          break;
        }
        cursor = result.pageInfo.endCursor;
      }

      expect(collected).toHaveLength(ROW_COUNT);
      expect(new Set(collected).size).toBe(ROW_COUNT);
    }, 60000);
  });

  describe('page consistency', () => {
    it('no overlap between consecutive pages', async () => {
      const orderBy: OrderByConditions[] = [{ createdAt: 'desc' }];
      const firstPage = await getKeysetPagination({
        pageData: { first: PAGE_SIZE },
        tableVersionId,
        orderBy,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      const secondPage = await getKeysetPagination({
        pageData: { first: PAGE_SIZE, after: firstPage.pageInfo.endCursor },
        tableVersionId,
        orderBy,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      const ids1 = new Set(firstPage.edges.map((e) => e.node.id));
      const ids2 = new Set(secondPage.edges.map((e) => e.node.id));
      const overlap = [...ids1].filter((id) => ids2.has(id));

      expect(firstPage.edges).toHaveLength(PAGE_SIZE);
      expect(secondPage.edges).toHaveLength(PAGE_SIZE);
      expect(overlap).toEqual([]);
    });

    it('totalCount is consistent', async () => {
      const result = await getKeysetPagination({
        pageData: { first: PAGE_SIZE },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(result.totalCount).toBe(ROW_COUNT);
    });
  });

  describe('cursor validation', () => {
    it('should return first page for invalid cursor', async () => {
      const result = await getKeysetPagination({
        pageData: { first: PAGE_SIZE, after: 'invalid-cursor' },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(result.edges).toHaveLength(PAGE_SIZE);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should return first page for old numeric cursor', async () => {
      const result = await getKeysetPagination({
        pageData: { first: PAGE_SIZE, after: '100' },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(result.edges).toHaveLength(PAGE_SIZE);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should return first page when sort changes', async () => {
      const orderByAsc: OrderByConditions[] = [{ createdAt: 'asc' }];
      const orderByDesc: OrderByConditions[] = [{ createdAt: 'desc' }];

      const firstPage = await getKeysetPagination({
        pageData: { first: PAGE_SIZE },
        tableVersionId,
        orderBy: orderByAsc,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      const secondPage = await getKeysetPagination({
        pageData: { first: PAGE_SIZE, after: firstPage.pageInfo.endCursor },
        tableVersionId,
        orderBy: orderByDesc,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(secondPage.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe('pageInfo', () => {
    it('first page should have hasNextPage=true, hasPreviousPage=false', async () => {
      const result = await getKeysetPagination({
        pageData: { first: PAGE_SIZE },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBeDefined();
      expect(result.pageInfo.endCursor).toBeDefined();
    });

    it('middle page should have both hasNextPage=true and hasPreviousPage=true', async () => {
      const firstPage = await getKeysetPagination({
        pageData: { first: PAGE_SIZE },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      const middlePage = await getKeysetPagination({
        pageData: { first: PAGE_SIZE, after: firstPage.pageInfo.endCursor },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(middlePage.pageInfo.hasNextPage).toBe(true);
      expect(middlePage.pageInfo.hasPreviousPage).toBe(true);
    });

    it('last page should have hasNextPage=false', async () => {
      const result = await getKeysetPagination({
        pageData: { first: ROW_COUNT },
        tableVersionId,
        queryRaw: (sql) => prisma.$queryRaw(sql),
        transformRows: async (rows) => rows,
      });

      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.edges).toHaveLength(ROW_COUNT);
    }, 30000);
  });

  describe('duplicate sort values', () => {
    let dupTableVersionId: string;
    const DUP_COUNT = 1000;

    beforeAll(async () => {
      const table = await prisma.table.create({
        data: {
          id: nanoid(),
          versionId: nanoid(),
          createdId: nanoid(),
        },
      });
      dupTableVersionId = table.versionId;

      const sameTimestamp = new Date('2025-06-01T12:00:00.000Z');
      const versionIds: string[] = [];

      const rows = Array.from({ length: DUP_COUNT }, (_, i) => {
        const vId = nanoid();
        versionIds.push(vId);
        return {
          id: `dup-${String(i).padStart(4, '0')}`,
          versionId: vId,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: { index: i },
          createdAt: sameTimestamp,
        };
      });

      await prisma.row.createMany({ data: rows });

      for (let batch = 0; batch < versionIds.length; batch += 500) {
        const batchIds = versionIds.slice(batch, batch + 500);
        await Promise.all(
          batchIds.map((vId) =>
            prisma.row.update({
              where: { versionId: vId },
              data: {
                tables: { connect: { versionId: dupTableVersionId } },
              },
            }),
          ),
        );
      }
    }, 60000);

    it('should visit all rows exactly once with duplicate createdAt', async () => {
      const collected: string[] = [];
      let cursor: string | undefined;

      while (true) {
        const result = await getKeysetPagination({
          pageData: { first: 50, after: cursor },
          tableVersionId: dupTableVersionId,
          queryRaw: (sql) => prisma.$queryRaw(sql),
          transformRows: async (rows) => rows,
        });

        collected.push(...result.edges.map((e) => e.node.id));

        if (!result.pageInfo.hasNextPage) {
          break;
        }
        cursor = result.pageInfo.endCursor;
      }

      expect(collected).toHaveLength(DUP_COUNT);
      expect(new Set(collected).size).toBe(DUP_COUNT);
    }, 30000);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
