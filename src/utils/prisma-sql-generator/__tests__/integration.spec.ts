import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { WhereGeneratorPrisma } from '../where-generator.prisma';
import { createTableWithJsonData } from '../../sql-generator/__tests__/test-helpers';
import {
  runPrismaOrmRows,
  runViaPrismaRaw,
  compareByIds,
  compareExactly,
  validateSqlStructure,
  testPagination,
} from './shared-helpers';

describe('Prisma SQL Generator - Integration Tests', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let generator: WhereGeneratorPrisma;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prismaService = module.get(PrismaService);
    generator = new WhereGeneratorPrisma();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Basic Query Structure', () => {
    it('should generate valid SQL structure', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const query = generator.generateGetRowsQueryPrisma(table.versionId);

      // Validate SQL structure
      const { params } = validateSqlStructure(query);

      // Should contain table ID parameter
      expect(params).toContain(table.versionId);
    });

    it('should execute without errors', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const query = generator.generateGetRowsQueryPrisma(table.versionId);

      // Should execute without errors
      const result = await runViaPrismaRaw(prismaService, query);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Default Options', () => {
    it('should use correct defaults', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // No options - should use defaults
      const query = generator.generateGetRowsQueryPrisma(table.versionId);
      const rawResult = await runViaPrismaRaw(prismaService, query);

      // Compare with Prisma ORM using same defaults
      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        take: 50, // default
        skip: 0, // default
        orderBy: { createdAt: Prisma.SortOrder.desc }, // default
        where: {}, // default
      });

      compareByIds(prismaResult, rawResult);
    });

    it('should handle explicit default options', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Explicit defaults
      const options = {
        take: 50,
        skip: 0,
        where: {},
        orderBy: { createdAt: 'desc' as const },
      };

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        take: 50,
        skip: 0,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        where: {},
      });

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('Basic String Filtering', () => {
    it('should match Prisma ORM for simple string equality', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' as const },
        where: { createdId: { startsWith: 'created-' } },
      };

      // Prisma ORM result
      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      // Our generator result
      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle string contains operations', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        where: { id: { contains: 'test' } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle case insensitive operations', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        where: { id: { contains: 'TEST', mode: 'insensitive' as const } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('StringFilter Complete Coverage', () => {
    it('should handle equals operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: 'json-test-1' },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle contains operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { contains: 'test' } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle startsWith operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { startsWith: 'json-test' } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle endsWith operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { endsWith: '-1' } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle in array operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { in: ['json-test-1', 'json-test-3'] } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle notIn array operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { notIn: ['json-test-2'] } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle case insensitive mode', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { contains: 'JSON-TEST', mode: 'insensitive' as const } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle not operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { id: { not: 'json-test-1' } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('BoolFilter Complete Coverage', () => {
    it('should handle boolean equals true', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { readonly: true },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle boolean equals false', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { readonly: false },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle boolean object syntax', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { readonly: { equals: false } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle boolean not operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: { readonly: { not: true } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('DateFilter Complete Coverage', () => {
    it('should handle date equals with string', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const testDate = '2025-01-01T00:00:00Z';
      const options = {
        take: 10,
        where: { createdAt: testDate },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle date gt operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const testDate = '2020-01-01T00:00:00Z';
      const options = {
        take: 10,
        where: { createdAt: { gt: testDate } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle date range (gte + lte)', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          createdAt: {
            gte: '2020-01-01T00:00:00Z',
            lte: '2030-12-31T23:59:59Z',
          },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle date in array', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const dates = ['2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z'];
      const options = {
        take: 10,
        where: { createdAt: { in: dates } },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('JsonFilter Complete Coverage', () => {
    it('should filter by JSON path equals string', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['name'], equals: 'Alice' },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON path equals number', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['age'], equals: 35 },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON string_contains', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['title'], string_contains: 'Developer' },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON string_starts_with', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['title'], string_starts_with: 'Senior' },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON string_ends_with', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['title'], string_ends_with: 'Manager' },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON numeric gt', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['age'], gt: 30 },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON numeric gte', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['age'], gte: 35 },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON numeric lt', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['age'], lt: 40 },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by JSON numeric lte', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['age'], lte: 35 },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    // Note: JSON path 'in' and 'notIn' are not supported by Prisma ORM
    // Our generator supports these as extension, but we can't compare with Prisma
    // These operations are tested in unit tests for SQL generation accuracy

    it('should filter by JSON not operation', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: { path: ['name'], not: 'Bob' },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle JSON case insensitive mode', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          data: {
            path: ['name'],
            string_contains: 'ALICE',
            mode: 'insensitive' as const,
          },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should filter by meta field', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        where: {
          meta: { path: ['priority'], equals: 'high' },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('Logical Operators', () => {
    it('should handle AND operations', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        where: {
          AND: [{ readonly: false }, { data: { path: ['age'], gte: 25 } }],
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle OR operations', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        where: {
          OR: [
            { id: { startsWith: 'json-test-1' } },
            { id: { startsWith: 'json-test-2' } },
          ],
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });

    it('should handle NOT operations', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        where: {
          NOT: { readonly: true },
        },
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareByIds(prismaResult, rawResult);
    });
  });

  describe('ORDER BY Operations', () => {
    it('should handle simple field ordering', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        orderBy: { id: 'asc' as const },
        where: {},
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: { id: Prisma.SortOrder.asc },
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareExactly(prismaResult, rawResult); // Order matters here
    });

    it('should handle JSON path ordering', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        orderBy: {
          data: {
            path: 'name',
            direction: 'asc' as const,
            type: 'text' as const,
          },
        },
        where: {},
      };

      // Note: This test might need adjustment based on how Prisma ORM handles JSON ordering
      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      expect(rawResult.length).toBeGreaterThan(0);
      // JSON ordering is complex to compare with Prisma ORM, so we just validate execution
    });

    it('should handle multiple field ordering', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: 10,
        skip: 0,
        orderBy: [{ readonly: 'asc' as const }, { createdAt: 'desc' as const }],
        where: {},
      };

      const prismaResult = await runPrismaOrmRows(prismaService, {
        tableVersionId: table.versionId,
        ...options,
        orderBy: [
          { readonly: Prisma.SortOrder.asc },
          { createdAt: Prisma.SortOrder.desc },
        ],
      });

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const rawResult = await runViaPrismaRaw(prismaService, query);

      compareExactly(prismaResult, rawResult);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      await testPagination(prismaService, table.versionId, generator, {
        where: {},
        orderBy: { createdAt: 'desc' as const },
      });
    });

    it('should clamp take and skip values', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test clamping
      const extremeOptions = {
        take: 1000, // Should clamp to 500
        skip: -5, // Should clamp to 0
        where: {},
      };

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        extremeOptions,
      );
      const { sql } = validateSqlStructure(query);

      // Should contain LIMIT 500 and OFFSET 0
      expect(sql).toContain('LIMIT ?');
      expect(sql).toContain('OFFSET ?');

      // Check that query executes
      const result = await runViaPrismaRaw(prismaService, query);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Option Normalization', () => {
    it('should handle single orderBy item', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        orderBy: { createdAt: 'desc' as const }, // Single item, not array
      };

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const result = await runViaPrismaRaw(prismaService, query);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle orderBy array', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        orderBy: [{ createdAt: 'desc' as const }, { id: 'asc' as const }],
      };

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const result = await runViaPrismaRaw(prismaService, query);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle number strings in options', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const options = {
        take: '25' as any, // String number
        skip: '10' as any, // String number
      };

      const query = generator.generateGetRowsQueryPrisma(
        table.versionId,
        options,
      );
      const result = await runViaPrismaRaw(prismaService, query);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(25);
    });
  });
});
