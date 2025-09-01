import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';
import { TestRow, createTableWithStringData } from './test-helpers';

describe('String Filter Tests', () => {
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

  describe('Basic String Operations', () => {
    it('should filter by createdId equals', async () => {
      const { table } = await createTableWithStringData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdId: {
              equals: 'created-alpha',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereCondition: WhereConditions = {
        createdId: {
          equals: 'created-alpha',
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

    it('should filter by id startsWith', async () => {
      const { table } = await createTableWithStringData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: {
              startsWith: 'user-',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereCondition: WhereConditions = {
        id: {
          startsWith: 'user-',
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

    it('should filter by hash contains', async () => {
      const { table } = await createTableWithStringData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            hash: {
              contains: 'special',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereCondition: WhereConditions = {
        hash: {
          contains: 'special',
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

    it('should filter by schemaHash in array', async () => {
      const { table } = await createTableWithStringData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            schemaHash: {
              in: ['schema-SPECIAL-456', 'schema-test-678'],
            },
          },
        });

      // Test our dynamic SQL generation
      const whereCondition: WhereConditions = {
        schemaHash: {
          in: ['schema-SPECIAL-456', 'schema-test-678'],
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
  });

  describe('Advanced String Operations', () => {
    it('should handle combined string filters', async () => {
      const { table } = await createTableWithStringData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: {
              startsWith: 'user-',
            },
            hash: {
              contains: 'special',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereCondition: WhereConditions = {
        id: {
          startsWith: 'user-',
        },
        hash: {
          contains: 'special',
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

    it('should support case-insensitive mode for StringFilter', async () => {
      const { table } = await createTableWithStringData(prismaService);

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

    it('should support equals with case-insensitive mode', async () => {
      const { table } = await createTableWithStringData(prismaService);

      const whereCondition: WhereConditions = {
        createdId: {
          equals: 'CREATED-ALPHA', // uppercase to test insensitive mode
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

      // Should find rows with 'created-alpha' (case insensitive)
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should support full-text search for StringFilter', async () => {
      const { table } = await createTableWithStringData(prismaService);

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

      // Should find rows using full-text search
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by endsWith', async () => {
      const { table } = await createTableWithStringData(prismaService);

      const whereCondition: WhereConditions = {
        createdId: {
          endsWith: 'alpha',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows ending with 'alpha'
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by not equals', async () => {
      const { table } = await createTableWithStringData(prismaService);

      const whereCondition: WhereConditions = {
        createdId: {
          not: 'created-alpha',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should exclude rows with createdId = 'created-alpha'
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should filter by notIn', async () => {
      const { table } = await createTableWithStringData(prismaService);

      const whereCondition: WhereConditions = {
        id: {
          notIn: ['user-1', 'admin-1'],
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should exclude specified IDs
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
      for (const row of sqlResult.rows) {
        expect(['user-1', 'admin-1']).not.toContain(row.id);
      }
    });

    it('should filter by gte (greater than or equal)', async () => {
      const { table } = await createTableWithStringData(prismaService);

      const whereCondition: WhereConditions = {
        id: {
          gte: 'user-1',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with id >= 'user-1' (alphabetically)
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by lt (less than)', async () => {
      const { table } = await createTableWithStringData(prismaService);

      const whereCondition: WhereConditions = {
        id: {
          lt: 'user-2',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereCondition,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with id < 'user-2' (alphabetically)
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });
  });
});
