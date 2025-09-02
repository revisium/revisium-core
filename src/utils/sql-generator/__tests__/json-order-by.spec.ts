import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions, RowOrderInput } from '../types';
import { createTableWithComplexJsonData } from './test-helpers';

// Safe JSON parsing helper function
function safeParseJSON(data: any): any {
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

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

      // Verify results are sorted by data.name in ascending order
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const names = sqlResult.rows
        .map((row: any) => {
          const dataObj = safeParseJSON(row.data);
          return dataObj?.name || '';
        })
        .filter((name) => name);

      // Should be sorted: Alice, Bob, Charlie, David, Eve
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'David', 'Eve']);

      // Verify SQL generation is correct (minimal check)
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('r."data"');
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

      // Verify results are sorted by data.user.age in descending order
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const ages = sqlResult.rows
        .map((row: any) => {
          const dataObj = safeParseJSON(row.data);
          return dataObj?.user?.age || 0;
        })
        .filter((age) => age > 0);

      // Should be sorted by age descending: 42, 35, 31, 28, 25
      expect(ages).toEqual([42, 35, 31, 28, 25]);

      // Verify SQL generation is correct (minimal check)
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('user,age');
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

      // Verify results are sorted by first tag element
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const firstTags = sqlResult.rows
        .map((row: any) => {
          const dataObj = safeParseJSON(row.data);
          return dataObj?.tags?.[0] || '';
        })
        .filter((tag) => tag);

      // Should be sorted by first tag: admin, admin, guest, user, user
      expect(firstTags).toEqual(['admin', 'admin', 'guest', 'user', 'user']);

      // Verify SQL generation
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('tags,0');
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

      // Verify results are sorted by max product price in descending order
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const names = sqlResult.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.name || '';
      });

      // Expected order by max price: David (299.0), Bob (199.0), Alice (149.5), Charlie (129.99), Eve (119.0)
      expect(names).toEqual(['David', 'Bob', 'Alice', 'Charlie', 'Eve']);

      // Verify SQL generation contains aggregation
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('MAX');
      expect(sql).toContain('products');
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

      // Verify results are sorted by min scores in ascending order
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const names = sqlResult.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.name || '';
      });

      // Expected order by min scores: Bob (70), Eve (78), Alice (85), Charlie (87), David (89)
      expect(names).toEqual(['Bob', 'Eve', 'Alice', 'Charlie', 'David']);

      // Verify SQL generation contains aggregation
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('MIN');
      expect(sql).toContain('scores');
    });

    it('should order by array min aggregation with subPath ($.products[*].price min)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.products[*].price',
            direction: 'asc',
            type: 'float',
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

      // Verify results are sorted by min product price in ascending order
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const names = sqlResult.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.name || '';
      });

      // Expected order by min price: Eve (49.99), Bob (79.99), Charlie (89.5), Alice (99.99), David (159.99)
      expect(names).toEqual(['Eve', 'Bob', 'Charlie', 'Alice', 'David']);

      // Verify SQL generation contains MIN with subPath
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain("SELECT MIN((value#>>'{price}')::float)");
      expect(sql).toContain('FROM jsonb_array_elements');
    });

    it('should order by array avg aggregation without subPath ($.scores[*] avg)', async () => {
      const { table } = await createTableWithComplexJsonData(prismaService);

      const orderBy: RowOrderInput[] = [
        {
          data: {
            path: '$.scores[*]',
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

      // Verify results are sorted by average scores in descending order
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      const names = sqlResult.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.name || '';
      });

      // Expected order by avg scores: David (~91.3), Alice (90), Charlie (~89), Eve (~81.7), Bob (75)
      expect(names).toEqual(['David', 'Alice', 'Charlie', 'Eve', 'Bob']);

      // Verify SQL generation contains AVG without subPath
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain("SELECT AVG((value#>>'{}':text[])::float");
      expect(sql).toContain('FROM jsonb_array_elements');
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

      // Verify mixed ordering works correctly - should order by priority descending as secondary sort
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      // Extract IDs to verify mixed sorting worked
      const ids = sqlResult.rows.map((row: any) => row.id);
      expect(ids.length).toBeGreaterThan(0);

      // Verify SQL generation contains all ORDER BY clauses
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('r."createdAt"');
      expect(sql).toContain('priority');
      expect(sql).toContain('r."id"');
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
          const dataObj = safeParseJSON(row.data);
          return dataObj?.createdDate || null;
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

  describe('parseJsonPath method coverage via complex paths', () => {
    let testTable: any;

    beforeAll(async () => {
      testTable = await createTableWithComplexJsonData(prismaService);
    });

    it('should handle complex JSONPath expressions correctly', async () => {
      const paths = [
        { path: 'simple', expected: ['simple'] },
        { path: 'nested.path', expected: ['nested', 'path'] },
        { path: '$.jsonpath.style', expected: ['jsonpath', 'style'] },
        { path: '$.array[0].item', expected: ['array', '0', 'item'] },
      ];

      paths.forEach(({ path, expected }) => {
        const { sql } = generateGetRowsQuery(
          testTable.table.versionId,
          10,
          0,
          {},
          [{ data: { path, direction: 'asc', type: 'text' } }],
        );

        // Should generate SQL with correct path format
        if (expected.length === 1) {
          expect(sql).toContain(`#>>'{${expected[0]}}'`);
        } else {
          expect(sql).toContain(`#>>'{${expected.join(',')}}'`);
        }
        expect(sql).toContain('ORDER BY');
        expect(sql).toContain('r."data"');
      });
    });

    it('should handle very deep JSON paths', async () => {
      const { sql } = generateGetRowsQuery(
        testTable.table.versionId,
        10,
        0,
        {},
        [
          {
            data: {
              path: 'level1.level2.level3.level4.level5.deepValue',
              direction: 'asc',
              type: 'text',
            },
          },
        ],
      );

      expect(sql).toContain('level1,level2,level3,level4,level5,deepValue');
      expect(sql).toContain('::text ASC');
    });

    it('should correctly handle different JSON value types in real queries', async () => {
      // Test sorting by actual data to verify parseJsonPath and type casting work
      const { sql, params } = generateGetRowsQuery(
        testTable.table.versionId,
        10,
        0,
        {},
        [{ data: { path: 'name', direction: 'asc', type: 'text' } }],
      );

      const result = await pgClient.query(sql, params);
      const names = result.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.name || '';
      });

      // Should be sorted alphabetically: Alice, Bob, Charlie, David, Eve
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'David', 'Eve']);
    });

    it('should correctly handle integer JSON sorting with parseJsonPath', async () => {
      const { sql, params } = generateGetRowsQuery(
        testTable.table.versionId,
        10,
        0,
        {},
        [{ data: { path: 'priority', direction: 'desc', type: 'int' } }],
      );

      const result = await pgClient.query(sql, params);
      const priorities = result.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.priority || 0;
      });

      // Should be sorted by priority desc: 4, 3, 2, 1, 1
      expect(priorities).toEqual([4, 3, 2, 1, 1]);

      // Verify SQL contains proper type casting
      expect(sql).toContain('::int DESC');
      expect(sql).toContain('priority');
    });

    it('should correctly handle nested path parsing and sorting', async () => {
      const { sql, params } = generateGetRowsQuery(
        testTable.table.versionId,
        10,
        0,
        {},
        [{ data: { path: 'user.age', direction: 'asc', type: 'int' } }],
      );

      const result = await pgClient.query(sql, params);
      const ages = result.rows.map((row: any) => {
        const dataObj = safeParseJSON(row.data);
        return dataObj?.user?.age || 0;
      });

      // Should be sorted by age ascending: 25, 28, 31, 35, 42
      expect(ages).toEqual([25, 28, 31, 35, 42]);

      // Verify correct nested path parsing
      expect(sql).toContain('{user,age}');
      expect(sql).toContain('::int ASC');
    });
  });
});
