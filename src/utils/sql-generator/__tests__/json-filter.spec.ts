import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';
import { TestRow, createTableWithJsonData } from './test-helpers';

describe('JSON Filter Tests', () => {
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

  describe('Basic JSON Path Operations', () => {
    it('should filter by JSON path equals', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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

    it('should filter by JSON path string_contains', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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

    it('should filter by JSON path string_contains with case-insensitive mode', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const whereConditions: WhereConditions = {
        data: {
          path: ['title'],
          string_contains: 'developer',
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

      // Should find rows with 'Developer' (case insensitive)
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should filter by JSON path number comparison', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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

    it('should handle combined JSON + boolean filters', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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
              equals: 'admin',
            },
            readonly: false,
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          equals: 'admin',
        },
        readonly: false,
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
  });

  describe('Advanced JSON Path Operations', () => {
    it('should filter by JSON path string starts with', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const whereConditions: WhereConditions = {
        data: {
          path: ['title'],
          string_starts_with: 'Senior',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with titles starting with 'Senior'
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should filter by JSON path number less than', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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

    it('should filter by JSON path not equals', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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
  });

  describe('Nested JSON Path Operations', () => {
    it('should filter by nested JSON path string equals', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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
              equals: 'Eve Profile',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['user', 'profile', 'name'],
          equals: 'Eve Profile',
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

    it('should filter by deeply nested JSON path (3 levels)', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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

    it('should filter by nested JSON path with string_contains and mode', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const whereConditions: WhereConditions = {
        data: {
          path: ['user', 'profile', 'bio'],
          string_contains: 'DESIGNER',
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

      // Should find rows with bio containing 'designer' (case insensitive)
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should filter by nested JSON path number comparison', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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
  });

  describe('JSON Array Operations', () => {
    it('should filter by JSON path in array', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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

    it('should filter by JSON path not in array', async () => {
      const { table } = await createTableWithJsonData(prismaService);

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
});
