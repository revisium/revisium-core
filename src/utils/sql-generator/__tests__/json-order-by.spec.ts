import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions, RowOrderInput } from '../types';
import { createTableWithComplexJsonData } from './test-helpers';

describe('JSON Path ORDER BY Tests', () => {
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

  describe('Simple JSON Path Ordering', () => {
    it('should order by simple JSON path (data.name)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'name',
            direction: 'asc',
            type: 'text',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains correct JSON path ordering
      expect(sql).toContain('(r."data"#>>\'{name}\')::text ASC');

      // Verify results are sorted by data.name
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const names = sqlResult.rows
        .map((row: any) => {
          try {
            return JSON.parse(row.data)?.name || '';
          } catch {
            return '';
          }
        })
        .filter((name) => name);

      // Check if names are in ascending order
      for (let i = 1; i < names.length; i++) {
        expect(names[i].localeCompare(names[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });

    it('should order by nested JSON path (data.user.age)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'user.age',
            direction: 'desc',
            type: 'int',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains correct nested JSON path ordering
      expect(sql).toContain('(r."data"#>>\'{user,age}\')::int DESC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should order by array element access ($.tags[0])', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.tags[0]',
            direction: 'asc',
            type: 'text',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains correct array element access
      expect(sql).toContain('(r."data"#>>\'{tags,0}\')::text ASC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Array Aggregation Ordering', () => {
    it('should order by array max aggregation ($.products[*].price max)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.products[*].price',
            direction: 'desc',
            type: 'float',
            aggregation: 'max',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains correct array aggregation
      expect(sql).toContain("SELECT MAX((value#>>'{price}')::float)");
      expect(sql).toContain(
        'FROM jsonb_array_elements(r."data"#>\'{products}\')',
      );
      expect(sql).toContain('DESC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should order by array min aggregation ($.scores[*] min)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.scores[*]',
            direction: 'asc',
            type: 'int',
            aggregation: 'min',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains correct array min aggregation
      expect(sql).toContain("SELECT MIN((value#>>'{}'::text[])::int)");
      expect(sql).toContain(
        'FROM jsonb_array_elements(r."data"#>\'{scores}\')',
      );
      expect(sql).toContain('ASC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should order by array avg aggregation ($.reviews[*].rating avg)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.reviews[*].rating',
            direction: 'desc',
            type: 'float',
            aggregation: 'avg',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains correct array avg aggregation
      expect(sql).toContain("SELECT AVG((value#>>'{rating}')::float)");
      expect(sql).toContain(
        'FROM jsonb_array_elements(r."data"#>\'{reviews}\')',
      );
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should order by first element (default aggregation)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.tags[*]',
            direction: 'asc',
            type: 'text',
            aggregation: 'first', // explicit first
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should use array index access for first element
      expect(sql).toContain('(r."data"#>>\'{tags,0}\')::text ASC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should order by last element', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.tags[*]',
            direction: 'desc',
            type: 'text',
            aggregation: 'last',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should use negative index for last element
      expect(sql).toContain('(r."data"#>>\'{tags,-1}\')::text DESC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed Ordering (Regular Fields + JSON)', () => {
    it('should combine regular field with JSON path ordering', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        { createdAt: 'desc' }, // Regular field
        {
          data: {
            path: 'priority',
            direction: 'desc',
            type: 'int',
          },
        }, // JSON field
        { id: 'asc' }, // Regular field
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify mixed ORDER BY clause
      expect(sql).toContain('r."createdAt" DESC');
      expect(sql).toContain('(r."data"#>>\'{priority}\')::int DESC');
      expect(sql).toContain('r."id" ASC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should combine multiple JSON path orderings', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'category',
            direction: 'asc',
            type: 'text',
          },
        },
        {
          meta: {
            path: 'score',
            direction: 'desc',
            type: 'float',
          },
        },
        {
          data: {
            path: '$.products[*].price',
            direction: 'desc',
            type: 'float',
            aggregation: 'max',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify multiple JSON orderings
      expect(sql).toContain('(r."data"#>>\'{category}\')::text ASC');
      expect(sql).toContain('(r."meta"#>>\'{score}\')::float DESC');
      expect(sql).toContain("SELECT MAX((value#>>'{price}')::float)");
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should combine WHERE conditions with JSON path ordering', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const whereConditions: WhereConditions = {
        readonly: false,
        data: {
          path: ['category'],
          equals: 'admin',
        },
      };

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'user.age',
            direction: 'desc',
            type: 'int',
          },
        },
        { createdAt: 'asc' },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify WHERE and ORDER BY combination
      expect(sql).toContain('WHERE');
      expect(sql).toContain('r."readonly" = ');
      expect(sql).toContain('r."data"->>'); // JSON filter in WHERE clause
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('(r."data"#>>\'{user,age}\')::int DESC');
      expect(sql).toContain('r."createdAt" ASC');
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('JSON Value Types', () => {
    it('should handle different JSON value types correctly', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'name',
            direction: 'asc',
            type: 'text',
          },
        },
        {
          data: {
            path: 'user.age',
            direction: 'desc',
            type: 'int',
          },
        },
        {
          data: {
            path: 'score',
            direction: 'desc',
            type: 'float',
          },
        },
        {
          data: {
            path: 'active',
            direction: 'desc',
            type: 'boolean',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify correct SQL type casting
      expect(sql).toContain('::text ASC');
      expect(sql).toContain('::int DESC');
      expect(sql).toContain('::float DESC');
      expect(sql).toContain('::boolean DESC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should handle timestamp type for JSON date values', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'createdDate',
            direction: 'desc',
            type: 'timestamp',
          },
        },
        {
          data: {
            path: 'lastLogin',
            direction: 'asc',
            type: 'timestamp',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify correct SQL timestamp casting for dates
      expect(sql).toContain('::timestamp DESC');
      expect(sql).toContain('::timestamp ASC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      // Verify data is ordered by createdDate descending
      const createdDates = sqlResult.rows
        .map((row: any) => {
          try {
            return JSON.parse(row.data)?.createdDate;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Should be in descending order (newest first)
      for (let i = 1; i < createdDates.length; i++) {
        const current = new Date(createdDates[i]);
        const previous = new Date(createdDates[i - 1]);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should handle timestamp aggregation in arrays', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      // First add array of dates to test data via direct SQL
      await pgClient.query(
        `UPDATE "Row" SET data = data || '{"eventDates": ["2025-01-01T10:00:00.000Z", "2025-01-15T14:30:00.000Z", "2025-01-20T16:45:00.000Z"]}' WHERE id = 'complex-1'`,
      );

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.eventDates[*]',
            direction: 'desc',
            type: 'timestamp',
            aggregation: 'max', // Latest date in array
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify SQL contains timestamp array aggregation
      expect(sql).toContain("SELECT MAX((value#>>'{}'::text[])::timestamp)");
      expect(sql).toContain('FROM jsonb_array_elements');
      expect(sql).toContain('DESC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });

    it('should handle mixed timestamp and other types in ordering', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'createdDate',
            direction: 'desc',
            type: 'timestamp',
          },
        },
        {
          data: {
            path: 'priority',
            direction: 'asc',
            type: 'int',
          },
        },
        {
          data: {
            path: 'name',
            direction: 'asc',
            type: 'text',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify correct mixed type casting
      expect(sql).toContain('::timestamp DESC');
      expect(sql).toContain('::int ASC');
      expect(sql).toContain('::text ASC');
      expect(sqlResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty JSON path gracefully', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'nonexistent_field',
            direction: 'asc',
            type: 'text',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should not throw error, just return results (nulls last/first)
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex nested paths', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: 'user.profile.settings.theme',
            direction: 'asc',
            type: 'text',
          },
        },
      ];

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
        orderBy,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Verify deep nesting in SQL
      expect(sql).toContain(
        '(r."data"#>>\'{user,profile,settings,theme}\')::text ASC',
      );
      expect(sqlResult.rows.length).toBeGreaterThanOrEqual(0);
    });
  });
});
