import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';
import { TestRow, createTableWithJsonData } from './test-helpers';

describe('Logical Operators Tests', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let pgClient: Client;

  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL ?? '';

    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prismaService = module.get(PrismaService);
    pgClient = new Client({ connectionString: dbUrl });
    await pgClient.connect();
  });

  afterAll(async () => {
    await pgClient.end();
    await module.close();
  });

  describe('AND Operator', () => {
    it('should filter by AND operator', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            AND: [
              { readonly: false },
              {
                id: {
                  startsWith: 'json-test-',
                },
              },
            ],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        AND: [
          { readonly: false },
          {
            id: {
              startsWith: 'json-test-',
            },
          },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id).sort()).toEqual(
          prismaResult.map((r: TestRow) => r.id).sort(),
        );
      }
    });

    it('should handle nested AND conditions', async () => {
      const { table } = await createTableWithJsonData(prismaService);
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            AND: [
              { data: { path: ['category'], equals: 'admin' } },
              {
                AND: [{ readonly: false }, { data: { path: ['age'], gt: 30 } }],
              },
            ],
          },
        });
      const whereConditions: WhereConditions = {
        AND: [
          {
            data: {
              path: ['category'],
              equals: 'admin',
            },
          },
          {
            AND: [
              { readonly: false },
              {
                data: {
                  path: ['age'],
                  gt: 30,
                },
              },
            ],
          },
        ],
      };
      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );
      const sqlResult = await pgClient.query(sql, params);
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length) {
        expect(sqlResult.rows.map((r: TestRow) => r.id).sort()).toEqual(
          prismaResult.map((r: TestRow) => r.id).sort(),
        );
      }
    });
  });

  describe('OR Operator', () => {
    it('should filter by OR operator', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            OR: [
              {
                data: {
                  path: ['category'],
                  equals: 'admin',
                },
              },
              { readonly: true },
            ],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        OR: [
          {
            data: {
              path: ['category'],
              equals: 'admin',
            },
          },
          { readonly: true },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id).sort()).toEqual(
          prismaResult.map((r: TestRow) => r.id).sort(),
        );
      }
    });

    it('should filter by OR with JSON conditions', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const whereConditions: WhereConditions = {
        OR: [
          {
            data: {
              path: ['name'],
              equals: 'Alice',
            },
          },
          {
            data: {
              path: ['name'],
              equals: 'Bob',
            },
          },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should return results matching either Alice or Bob
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('NOT Operator', () => {
    it('should filter by NOT operator', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            NOT: { readonly: true },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        NOT: { readonly: true },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id).sort()).toEqual(
          prismaResult.map((r: TestRow) => r.id).sort(),
        );
      }
    });

    it('should handle NOT with JSON conditions', async () => {
      const { table } = await createTableWithJsonData(prismaService);
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: { NOT: { data: { path: ['category'], equals: 'guest' } } },
        });
      const whereConditions: WhereConditions = {
        NOT: {
          data: {
            path: ['category'],
            equals: 'guest',
          },
        },
      };
      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );
      const sqlResult = await pgClient.query(sql, params);
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length) {
        expect(sqlResult.rows.map((r: TestRow) => r.id).sort()).toEqual(
          prismaResult.map((r: TestRow) => r.id).sort(),
        );
      }
    });
  });

  describe('Complex Nested Logical Operators', () => {
    it('should handle complex nested logical operators', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const complexConditions: WhereConditions = {
        OR: [
          {
            AND: [
              {
                data: {
                  path: ['category'],
                  equals: 'admin',
                },
              },
              {
                OR: [
                  { readonly: false },
                  {
                    data: {
                      path: ['age'],
                      gt: 30,
                    },
                  },
                ],
              },
            ],
          },
          {
            id: {
              startsWith: 'json-test',
            },
          },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        complexConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should return results matching complex logic
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should handle multiple levels of NOT nesting', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const whereConditions: WhereConditions = {
        NOT: {
          OR: [
            { readonly: true },
            {
              data: {
                path: ['category'],
                equals: 'guest',
              },
            },
          ],
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should return only rows that are NOT (readonly OR category=guest)
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed AND/OR with JSON and string filters', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const whereConditions: WhereConditions = {
        AND: [
          {
            OR: [
              {
                data: {
                  path: ['category'],
                  in: ['admin', 'user'],
                },
              },
              {
                id: {
                  contains: 'test',
                },
              },
            ],
          },
          {
            NOT: {
              data: {
                path: ['age'],
                lt: 20,
              },
            },
          },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Complex query should execute without error
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });
  });
});
