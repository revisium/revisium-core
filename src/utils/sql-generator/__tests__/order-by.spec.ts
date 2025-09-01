import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions, SortOrder, RowOrderInput } from '../types';
import { TestRow, createTableWithJsonData } from './test-helpers';

describe('ORDER BY Tests', () => {
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

  describe('Single Field Ordering', () => {
    it('should order by createdAt ascending', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.asc },
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [{ createdAt: 'asc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."createdAt" ASC');

      if (prismaResult.length > 1 && sqlResult.rows.length > 1) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should order by id descending', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { id: Prisma.SortOrder.desc },
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [{ id: 'desc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."id" DESC');

      if (prismaResult.length > 1 && sqlResult.rows.length > 1) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should order by readonly field', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { readonly: Prisma.SortOrder.asc },
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [{ readonly: 'asc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."readonly" ASC');

      if (prismaResult.length > 1 && sqlResult.rows.length > 1) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });
  });

  describe('Multiple Field Ordering', () => {
    it('should order by multiple fields', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: [
            { readonly: Prisma.SortOrder.asc },
            { createdAt: Prisma.SortOrder.desc },
          ],
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [
        { readonly: 'asc' },
        { createdAt: 'desc' },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."readonly" ASC, r."createdAt" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should order by three fields', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: [
            { readonly: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
            { createdAt: Prisma.SortOrder.desc },
          ],
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [
        { readonly: 'desc' },
        { id: 'asc' },
        { createdAt: 'desc' },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain(
        'ORDER BY r."readonly" DESC, r."id" ASC, r."createdAt" DESC',
      );

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });
  });

  describe('ORDER BY with WHERE conditions', () => {
    it('should combine WHERE and ORDER BY', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          where: {
            readonly: false,
          },
          orderBy: [{ id: Prisma.SortOrder.asc }],
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        readonly: false,
      };
      const rowOrderInput: RowOrderInput[] = [{ id: 'asc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('r."readonly" = $4');
      expect(sql).toContain('ORDER BY r."id" ASC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should combine JSON filters with ORDER BY', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          where: {
            data: {
              path: ['category'],
              equals: 'admin',
            },
          },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.desc },
          ],
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          equals: 'admin',
        },
      };
      const rowOrderInput: RowOrderInput[] = [
        { createdAt: 'asc' },
        { id: 'desc' },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('r."data"');
      expect(sql).toContain('ORDER BY r."createdAt" ASC, r."id" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });
  });

  describe('All Field Types ORDER BY', () => {
    it('should handle versionId ordering', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 5,
          skip: 0,
          orderBy: { versionId: Prisma.SortOrder.asc },
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [{ versionId: 'asc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        5,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."versionId" ASC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should handle hash ordering', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 5,
          skip: 0,
          orderBy: { hash: Prisma.SortOrder.desc },
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [{ hash: 'desc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        5,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."hash" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should handle updatedAt ordering', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 5,
          skip: 0,
          orderBy: { updatedAt: Prisma.SortOrder.desc },
        });

      // Test our dynamic SQL generation
      const rowOrderInput: RowOrderInput[] = [{ updatedAt: 'desc' }];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        5,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."updatedAt" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });
  });

  describe('Default Ordering', () => {
    it('should use default ordering when no orderBy specified', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first (Prisma's default is createdAt DESC)
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          where: { readonly: false },
          orderBy: { createdAt: Prisma.SortOrder.desc }, // Explicit default
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        readonly: false,
      };
      // No orderBy specified - should use default

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."createdAt" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should use default ordering when orderBy is empty array', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          where: { readonly: false },
          orderBy: { createdAt: Prisma.SortOrder.desc }, // Explicit default
        });

      // Test our dynamic SQL generation
      const whereConditions: WhereConditions = {
        readonly: false,
      };
      const rowOrderInput: RowOrderInput[] = []; // Empty array - should use default

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."createdAt" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive sort directions', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: [
            { id: Prisma.SortOrder.asc },
            { createdAt: Prisma.SortOrder.desc },
          ],
        });

      // Test our dynamic SQL generation with uppercase direction values
      const rowOrderInput: RowOrderInput[] = [
        { id: 'ASC' as SortOrder },
        { createdAt: 'DESC' as SortOrder },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        rowOrderInput,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      expect(sql).toContain('ORDER BY r."id" ASC, r."createdAt" DESC');

      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r: TestRow) => r.id)).toEqual(
          prismaResult.map((r: TestRow) => r.id),
        );
      }
    });

    it('should throw error for unsupported field', () => {
      expect(() => {
        generateGetRowsQuery('test-table-id', 10, 0, undefined, [
          { unsupportedField: 'asc' } as any,
        ]);
      }).toThrow('Unsupported ORDER BY field: unsupportedField');
    });
  });
});
