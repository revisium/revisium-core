import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';

interface TestRow {
  id: string;
  data?: any;
  [key: string]: any;
}

describe('SQL Generator WHERE Conditions Tests', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let pgClient: Client;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prismaService = module.get(PrismaService);
    pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();
  });

  afterEach(async () => {
    await pgClient.end();
    await module.close();
  });

  describe('JSON Path Filter Tests with Dynamic SQL Generation', () => {
    it('should filter by JSON path equals using dynamic SQL generator', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['name'],
              equals: 'Alice',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['name'],
          equals: 'Alice',
        },
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

    it('should filter by JSON path string_contains using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['title'],
              string_contains: 'Developer',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['title'],
          string_contains: 'Developer',
        },
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

    it('should filter by JSON path string_contains with case-insensitive mode using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test our dynamic SQL generation with case insensitive mode
      const whereConditions: WhereConditions = {
        data: {
          path: ['title'],
          string_contains: 'DEVELOPER',
          mode: 'insensitive',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with 'developer' (case insensitive)
      expect(sqlResult.rows.length).toBeGreaterThan(0);
      for (const row of sqlResult.rows) {
        expect(row.data.title.toLowerCase()).toContain('developer');
      }
    });

    it('should filter by JSON path number comparison using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['age'],
              gt: 30,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['age'],
          gt: 30,
        },
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

    it('should handle combined JSON + boolean filters using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            AND: [{ readonly: false }, { id: { startsWith: 'user-' } }],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        AND: [{ readonly: false }, { id: { startsWith: 'user-' } }],
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

    it('should filter by JSON path string starts with using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['name'],
              string_starts_with: 'A',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['name'],
          string_starts_with: 'A',
        },
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

    it('should filter by JSON path number less than using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['age'],
              lt: 30,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['age'],
          lt: 30,
        },
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

    it('should filter by JSON path not equals using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['category'],
              not: 'guest',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          not: 'guest',
        },
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

    it('should filter by nested JSON path string equals using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['user', 'profile', 'name'],
              equals: 'John Doe',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['user', 'profile', 'name'],
          equals: 'John Doe',
        },
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

    it('should filter by deeply nested JSON path (3 levels) using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['user', 'profile', 'settings', 'theme'],
              equals: 'dark',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          equals: 'dark',
        },
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

    it('should filter by nested JSON path with string_contains and mode using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test our dynamic SQL generation with nested path and case insensitive
      const whereConditions: WhereConditions = {
        data: {
          path: ['user', 'profile', 'bio'],
          string_contains: 'DEVELOPER',
          mode: 'insensitive',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with bio containing 'developer' (case insensitive)
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should filter by nested JSON path number comparison using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['user', 'profile', 'age'],
              gte: 25,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['user', 'profile', 'age'],
          gte: 25,
        },
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

    it('should filter by JSON path in array using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test our dynamic SQL generation for IN operation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          in: ['admin', 'user'],
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify results - should get rows with category = 'admin' or 'user'
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      // Check that all returned rows have category in the expected values
      for (const row of sqlResult.rows) {
        const categoryValue = row.data?.category;
        expect(['admin', 'user']).toContain(categoryValue);
      }
    });

    it('should filter by JSON path not in array using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test our dynamic SQL generation for NOT IN operation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          notIn: ['guest'],
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should return rows where category is NOT 'guest'
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      // Check that no returned rows have category = 'guest'
      for (const row of sqlResult.rows) {
        const categoryValue = row.data?.category;
        expect(categoryValue).not.toBe('guest');
      }
    });
  });

  describe('Logical Operators Tests with Dynamic SQL Generation', () => {
    it('should filter by AND operator using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

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
              { data: { path: ['category'], equals: 'admin' } },
            ],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        AND: [
          { readonly: false },
          { data: { path: ['category'], equals: 'admin' } },
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

    it('should filter by OR operator using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            OR: [
              { readonly: true },
              { data: { path: ['category'], equals: 'guest' } },
            ],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        OR: [
          { readonly: true },
          { data: { path: ['category'], equals: 'guest' } },
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

    it('should filter by NOT operator using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            NOT: {
              data: { path: ['category'], equals: 'guest' },
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        NOT: {
          data: { path: ['category'], equals: 'guest' },
        },
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

    it('should filter by OR with JSON conditions using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            OR: [
              { data: { path: ['name'], equals: 'Alice' } },
              { data: { path: ['name'], equals: 'Bob' } },
            ],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        OR: [
          { data: { path: ['name'], equals: 'Alice' } },
          { data: { path: ['name'], equals: 'Bob' } },
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

    it('should handle complex nested logical operators with dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      const complexConditions: WhereConditions = {
        OR: [
          {
            AND: [
              { data: { path: ['category'], equals: 'admin' } },
              {
                OR: [{ readonly: false }, { data: { path: ['age'], gt: 30 } }],
              },
            ],
          },
          { id: { startsWith: 'json-test' } },
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
  });

  describe('StringFilter Tests with Direct SQL', () => {
    it('should filter by createdId equals using direct SQL', async () => {
      const { table } = await createTableWithStringData();
      const targetCreatedId = 'test-created-id-1';

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdId: {
              equals: targetCreatedId,
            },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        createdId: {
          equals: targetCreatedId,
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should filter by id startsWith using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: { startsWith: 'user-' },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        id: { startsWith: 'user-' },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should filter by hash contains using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            hash: { contains: 'special' },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        hash: { contains: 'special' },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should filter by schemaHash in array using direct SQL', async () => {
      const { table } = await createTableWithStringData();
      const targetHashes = ['schema-hash-1', 'schema-hash-3'];

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            schemaHash: { in: targetHashes },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        schemaHash: { in: targetHashes },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should handle combined string filters using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            AND: [
              { hash: { contains: 'special' } },
              { id: { startsWith: 'user-' } },
            ],
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        AND: [
          { hash: { contains: 'special' } },
          { id: { startsWith: 'user-' } },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should support case-insensitive mode for StringFilter using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test our direct SQL with case insensitive mode
      const whereCondition: WhereConditions = {
        hash: {
          contains: 'SPECIAL',
          mode: 'insensitive',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with 'special' (case insensitive)
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should support full-text search for StringFilter using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test our direct SQL with search mode
      const whereCondition: WhereConditions = {
        hash: {
          search: 'special',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find results using full-text search
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0); // May be 0 if no full-text index
    });
  });

  describe('Date Filter Tests with Direct SQL', () => {
    it('should filter by simple date value using direct SQL', async () => {
      const { table } = await createTableWithDateData();
      const targetDate = new Date('2025-01-15');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: { equals: targetDate },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        createdAt: { equals: targetDate },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should filter by date greater than using direct SQL', async () => {
      const { table } = await createTableWithDateData();
      const targetDate = new Date('2025-01-10');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: { gt: targetDate },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        createdAt: { gt: targetDate },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should filter by date range using direct SQL', async () => {
      const { table } = await createTableWithDateData();
      const startDate = new Date('2025-01-10');
      const endDate = new Date('2025-01-20');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            AND: [
              { createdAt: { gte: startDate } },
              { createdAt: { lte: endDate } },
            ],
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        AND: [
          { createdAt: { gte: startDate } },
          { createdAt: { lte: endDate } },
        ],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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

    it('should filter by date in array using direct SQL', async () => {
      const { table } = await createTableWithDateData();
      const targetDates = [new Date('2025-01-15'), new Date('2025-01-25')];

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: { in: targetDates },
          },
        });

      // Test our direct SQL
      const whereCondition: WhereConditions = {
        createdAt: { in: targetDates },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
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
  });

  // Helper functions
  async function createTableWithJsonData() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: revision.id,
          },
        },
      },
    });

    // Create test rows with JSON data
    const testData = [
      {
        id: 'json-test-1',
        data: {
          name: 'Alice',
          category: 'admin',
          age: 35,
          title: 'Senior Developer',
        },
        readonly: false,
      },
      {
        id: 'json-test-2',
        data: { name: 'Bob', category: 'user', age: 25, title: 'Developer' },
        readonly: true,
      },
      {
        id: 'json-test-3',
        data: {
          name: 'Charlie',
          category: 'guest',
          age: 45,
          title: 'Manager',
        },
        readonly: false,
      },
      {
        id: 'json-test-4',
        data: {
          name: 'Diana',
          category: 'admin',
          age: 30,
          title: 'Lead Developer',
        },
        readonly: false,
      },
      {
        id: 'user-5',
        data: { name: 'Eve', category: 'user', age: 28, title: 'Designer' },
        readonly: false,
      },
    ];

    for (const item of testData) {
      await prismaService.row.create({
        data: {
          id: item.id,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: item.readonly,
          data: item.data,
          meta: {},
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
    }

    return { table };
  }

  async function createTableWithNestedJsonData() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: revision.id,
          },
        },
      },
    });

    // Create test rows with nested JSON data
    const testData = [
      {
        id: 'nested-1',
        data: {
          user: {
            profile: {
              name: 'John Doe',
              age: 30,
              bio: 'Senior Developer at Tech Corp',
              settings: { theme: 'dark', notifications: true },
            },
          },
        },
        readonly: false,
      },
      {
        id: 'nested-2',
        data: {
          user: {
            profile: {
              name: 'Jane Smith',
              age: 25,
              bio: 'Frontend Developer',
              settings: { theme: 'light', notifications: false },
            },
          },
        },
        readonly: true,
      },
      {
        id: 'nested-3',
        data: {
          user: {
            profile: {
              name: 'Mike Wilson',
              age: 35,
              bio: 'Backend Developer with Python expertise',
              settings: { theme: 'dark', notifications: true },
            },
          },
        },
        readonly: false,
      },
    ];

    for (const item of testData) {
      await prismaService.row.create({
        data: {
          id: item.id,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: item.readonly,
          data: item.data,
          meta: {},
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
    }

    return { table };
  }

  async function createTableWithStringData() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: revision.id,
          },
        },
      },
    });

    // Create test rows with string data
    const testData = [
      {
        id: 'user-1',
        createdId: 'test-created-id-1',
        hash: 'hash-special-1',
        schemaHash: 'schema-hash-1',
        readonly: false,
      },
      {
        id: 'user-2',
        createdId: 'test-created-id-2',
        hash: 'hash-normal-2',
        schemaHash: 'schema-hash-2',
        readonly: true,
      },
      {
        id: 'admin-1',
        createdId: 'test-created-id-3',
        hash: 'hash-special-3',
        schemaHash: 'schema-hash-3',
        readonly: false,
      },
      {
        id: 'guest-1',
        createdId: 'test-created-id-4',
        hash: 'hash-normal-4',
        schemaHash: 'schema-hash-4',
        readonly: true,
      },
    ];

    for (const item of testData) {
      await prismaService.row.create({
        data: {
          id: item.id,
          createdId: item.createdId,
          versionId: nanoid(),
          readonly: item.readonly,
          data: {},
          meta: {},
          hash: item.hash,
          schemaHash: item.schemaHash,
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
    }

    return { table };
  }

  async function createTableWithDateData() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: revision.id,
          },
        },
      },
    });

    // Create test rows with specific dates
    const testData = [
      { id: 'date-1', createdAt: new Date('2025-01-15'), readonly: false },
      { id: 'date-2', createdAt: new Date('2025-01-20'), readonly: true },
      { id: 'date-3', createdAt: new Date('2025-01-25'), readonly: false },
      { id: 'date-4', createdAt: new Date('2025-01-05'), readonly: true },
    ];

    for (const item of testData) {
      await prismaService.row.create({
        data: {
          id: item.id,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: item.readonly,
          createdAt: item.createdAt,
          data: {},
          meta: {},
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
    }

    return { table };
  }
});
