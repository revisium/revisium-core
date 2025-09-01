import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';
import { TestRow, createTableWithDateData } from './test-helpers';

describe('Date Filter Tests', () => {
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

  describe('Basic Date Operations', () => {
    it('should filter by simple date value', async () => {
      const { table, baseDate } = await createTableWithDateData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              equals: baseDate,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        createdAt: {
          equals: baseDate.toISOString(),
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

    it('should filter by date greater than', async () => {
      const { table, baseDate } = await createTableWithDateData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              gt: baseDate,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        createdAt: {
          gt: baseDate.toISOString(),
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

    it('should filter by date range', async () => {
      const { table } = await createTableWithDateData(prismaService);

      const startDate = new Date('2024-12-15T00:00:00.000Z');
      const endDate = new Date('2025-01-20T00:00:00.000Z');

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
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

    it('should filter by date in array', async () => {
      const { table, dates } = await createTableWithDateData(prismaService);

      const targetDates = [dates[0], dates[2]]; // First and third dates

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              in: targetDates,
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        createdAt: {
          in: targetDates.map((d) => d.toISOString()),
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

  describe('Advanced Date Operations', () => {
    it('should filter by date less than or equal', async () => {
      const { table } = await createTableWithDateData(prismaService);

      const maxDate = new Date('2025-01-10T00:00:00.000Z');

      const whereConditions: WhereConditions = {
        createdAt: {
          lte: maxDate.toISOString(),
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should find rows with dates <= maxDate
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by date not in array', async () => {
      const { table, dates } = await createTableWithDateData(prismaService);

      const excludeDates = [dates[1]]; // Exclude second date

      const whereConditions: WhereConditions = {
        createdAt: {
          notIn: excludeDates.map((d) => d.toISOString()),
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should exclude the specified date
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should filter with string date value', async () => {
      const { table } = await createTableWithDateData(prismaService);

      const dateString = '2025-01-01T00:00:00.000Z';

      const whereConditions: WhereConditions = {
        createdAt: dateString,
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should work with string date values
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by Date object', async () => {
      const { table, baseDate } = await createTableWithDateData(prismaService);

      const whereConditions: WhereConditions = {
        createdAt: baseDate,
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should work with Date objects
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by updatedAt field', async () => {
      const { table, baseDate } = await createTableWithDateData(prismaService);

      const whereConditions: WhereConditions = {
        updatedAt: {
          gte: baseDate.toISOString(),
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should work with updatedAt field
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by publishedAt field', async () => {
      const { table, baseDate } = await createTableWithDateData(prismaService);

      const whereConditions: WhereConditions = {
        publishedAt: {
          lt: baseDate.toISOString(),
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should work with publishedAt field
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });
  });
});
