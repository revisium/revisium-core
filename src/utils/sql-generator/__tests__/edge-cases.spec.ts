import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { WhereGenerator, generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';
import { createTableWithJsonData } from './test-helpers';

describe('Edge Cases and Error Handling Tests', () => {
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

  describe('WhereGenerator Edge Cases', () => {
    it('should handle empty conditions', () => {
      const generator = new WhereGenerator();
      const result = generator.generateWhere({});
      expect(result.sql).toBe('TRUE');
      expect(result.params).toEqual([]);
    });

    it('should handle null conditions', () => {
      const generator = new WhereGenerator();
      const result = generator.generateWhere(null as any);
      expect(result.sql).toBe('TRUE');
      expect(result.params).toEqual([]);
    });

    it('should handle undefined conditions', () => {
      const generator = new WhereGenerator();
      const result = generator.generateWhere(undefined as any);
      expect(result.sql).toBe('TRUE');
      expect(result.params).toEqual([]);
    });

    it('should track parameter indices correctly', () => {
      const generator = new WhereGenerator(10); // Start from param 10
      const result = generator.generateWhere({
        id: 'test-id',
        readonly: true,
      });

      expect(result.sql).toContain('$10');
      expect(result.sql).toContain('$11');
      expect(result.params).toEqual(['test-id', true]);
    });

    it('should test getParams() method directly', () => {
      const generator = new WhereGenerator();

      // Initially should be empty
      expect(generator.getParams()).toEqual([]);

      // Add some parameters manually using addParam
      generator.addParam('param1');
      generator.addParam('param2');
      generator.addParam(42);

      // getParams() should return all added parameters
      expect(generator.getParams()).toEqual(['param1', 'param2', 42]);
    });

    it('should handle single path JSON filter', () => {
      const generator = new WhereGenerator();
      const result = generator.generateWhere({
        data: {
          path: ['name'],
          equals: 'Alice',
        },
      });

      expect(result.sql).toContain('->>');
      expect(result.sql).not.toContain('#>>');
    });

    it('should handle multi-path JSON filter', () => {
      const generator = new WhereGenerator();
      const result = generator.generateWhere({
        data: {
          path: ['user', 'profile', 'name'],
          equals: 'Alice',
        },
      });

      expect(result.sql).toContain('#>>');
      expect(result.params[0]).toBe('{user,profile,name}');
      expect(result.params[1]).toBe('Alice');
    });
  });

  describe('StringFilter Error Cases', () => {
    it('should throw error for unsupported StringFilter', () => {
      const generator = new WhereGenerator();

      expect(() => {
        generator.generateWhere({
          id: {
            unsupportedOperation: 'value',
          } as any,
        });
      }).toThrow('Unsupported StringFilter');
    });

    it('should handle all StringFilter operations without errors', () => {
      const generator = new WhereGenerator();

      // Test all supported operations
      const operations = {
        equals: 'value',
        contains: 'substring',
        startsWith: 'prefix',
        endsWith: 'suffix',
        in: ['val1', 'val2'],
        notIn: ['val3', 'val4'],
        gt: 'a',
        gte: 'b',
        lt: 'z',
        lte: 'y',
        not: 'excluded',
        search: 'search term',
      };

      Object.entries(operations).forEach(([op, value]) => {
        expect(() => {
          generator.generateWhere({
            id: { [op]: value },
          });
        }).not.toThrow();
      });
    });

    it('should handle StringFilter with mode correctly', () => {
      const generator = new WhereGenerator();

      const result = generator.generateWhere({
        id: {
          contains: 'test',
          mode: 'insensitive',
        },
      });

      expect(result.sql).toContain('ILIKE');
    });
  });

  describe('BoolFilter Error Cases', () => {
    it('should throw error for unsupported BoolFilter', () => {
      const generator = new WhereGenerator();

      expect(() => {
        generator.generateWhere({
          readonly: {
            unsupportedOperation: true,
          } as any,
        });
      }).toThrow('Unsupported BoolFilter');
    });

    it('should handle BoolFilter equals and not operations', () => {
      const generator = new WhereGenerator();

      // Test equals
      const equalsResult = generator.generateWhere({
        readonly: { equals: true },
      });
      expect(equalsResult.sql).toContain('=');

      // Test not
      const notResult = generator.generateWhere({
        readonly: { not: false },
      });
      expect(notResult.sql).toContain('!=');
    });
  });

  describe('DateFilter Error Cases', () => {
    it('should throw error for unsupported DateFilter', () => {
      const generator = new WhereGenerator();

      expect(() => {
        generator.generateWhere({
          createdAt: {
            unsupportedOperation: new Date(),
          } as any,
        });
      }).toThrow('Unsupported DateFilter');
    });

    it('should handle Date objects and string dates', () => {
      const generator = new WhereGenerator();
      const testDate = new Date('2025-01-01');

      // Test Date object
      const dateResult = generator.generateWhere({
        createdAt: testDate,
      });
      expect(dateResult.params[0]).toBe(testDate.toISOString());

      // Test string date
      const stringResult = generator.generateWhere({
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(stringResult.params[0]).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle all DateFilter operations', () => {
      const generator = new WhereGenerator();
      const testDate = new Date('2025-01-01');

      const operations = {
        equals: testDate,
        gt: testDate,
        gte: testDate,
        lt: testDate,
        lte: testDate,
        in: [testDate],
        notIn: [testDate],
      };

      Object.entries(operations).forEach(([op, value]) => {
        expect(() => {
          generator.generateWhere({
            createdAt: { [op]: value },
          });
        }).not.toThrow();
      });
    });
  });

  describe('JsonFilter Error Cases', () => {
    it('should throw error for unsupported JsonFilter', () => {
      const generator = new WhereGenerator();

      expect(() => {
        generator.generateWhere({
          data: {
            path: ['test'],
            unsupportedOperation: 'value',
          } as any,
        });
      }).toThrow('Unsupported JsonFilter');
    });

    it('should handle JsonFilter with insensitive mode', () => {
      const generator = new WhereGenerator();

      const result = generator.generateWhere({
        data: {
          path: ['name'],
          equals: 'Alice',
          mode: 'insensitive',
        },
      });

      expect(result.sql).toContain('LOWER');
    });

    it('should handle JsonFilter string operations', () => {
      const generator = new WhereGenerator();

      const operations = {
        string_contains: 'substring',
        string_starts_with: 'prefix',
        string_ends_with: 'suffix',
      };

      Object.entries(operations).forEach(([op, value]) => {
        expect(() => {
          generator.generateWhere({
            data: {
              path: ['test'],
              [op]: value,
            },
          });
        }).not.toThrow();
      });
    });

    it('should handle JsonFilter numeric operations', () => {
      const generator = new WhereGenerator();

      const operations = {
        gt: 10,
        gte: 10,
        lt: 10,
        lte: 10,
      };

      Object.entries(operations).forEach(([op, value]) => {
        const result = generator.generateWhere({
          data: {
            path: ['age'],
            [op]: value,
          },
        });
        expect(result.sql).toContain('::numeric');
      });
    });

    it('should handle JsonFilter array operations', () => {
      const generator = new WhereGenerator();

      const result = generator.generateWhere({
        data: {
          path: ['tags'],
          array_contains: ['typescript'],
        },
      });

      expect(result.sql).toContain('@>');
    });

    it('should handle JsonFilter in/notIn with different types', () => {
      const generator = new WhereGenerator();

      // String values
      const stringResult = generator.generateWhere({
        data: {
          path: ['category'],
          in: ['admin', 'user'],
        },
      });
      expect(stringResult.sql).toContain('IN');

      // Non-string values (will be JSON stringified)
      const numberResult = generator.generateWhere({
        data: {
          path: ['age'],
          in: [25, 30],
        },
      });
      expect(numberResult.sql).toContain('IN');
    });

    it('should handle JsonFilter not operation with different types', () => {
      const generator = new WhereGenerator();

      // String value
      const stringResult = generator.generateWhere({
        data: {
          path: ['category'],
          not: 'admin',
        },
      });
      expect(stringResult.sql).toContain('IS NOT NULL');

      // Non-string value
      const numberResult = generator.generateWhere({
        data: {
          path: ['age'],
          not: 25,
        },
      });
      expect(numberResult.sql).toContain('IS NOT NULL');
    });
  });

  describe('Integration with real data', () => {
    it('should handle complex nested conditions without errors', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const complexConditions: WhereConditions = {
        OR: [
          {
            AND: [
              {
                data: {
                  path: ['category'],
                  equals: 'admin',
                  mode: 'insensitive',
                },
              },
              {
                readonly: { not: true },
              },
              {
                createdAt: {
                  gte: '2024-01-01T00:00:00.000Z',
                  lte: '2025-12-31T23:59:59.999Z',
                },
              },
            ],
          },
          {
            NOT: {
              OR: [
                {
                  data: {
                    path: ['age'],
                    in: [20, 25],
                  },
                },
                {
                  id: {
                    startsWith: 'temp-',
                    mode: 'insensitive',
                  },
                },
              ],
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

      // Should execute without errors
      expect(sqlResult.rows).toBeDefined();
      expect(sql).toContain('OR');
      expect(sql).toContain('AND');
      expect(sql).toContain('NOT');
    });

    it('should handle empty OR/AND arrays gracefully', () => {
      const generator = new WhereGenerator();

      const result = generator.generateWhere({
        OR: [],
        AND: [],
      });

      expect(result.sql).toBe('TRUE');
    });

    it('should handle mixed field types in complex query', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const mixedConditions: WhereConditions = {
        // String field
        id: { contains: 'test' },
        // Boolean field
        readonly: false,
        // Date field
        createdAt: { gt: '2024-01-01T00:00:00.000Z' },
        // JSON field
        data: {
          path: ['category'],
          equals: 'admin',
        },
        // Meta JSON field
        meta: {
          path: ['index'],
          gt: 0,
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        mixedConditions,
      );

      const sqlResult = await pgClient.query(sql, params);

      // Should execute without errors and combine all conditions
      expect(sqlResult.rows).toBeDefined();
      expect(sql).toContain('LIKE'); // String contains
      expect(sql).toContain('r."readonly"'); // Boolean
      expect(sql).toContain('r."createdAt"'); // Date
      expect(sql).toContain('r."data"'); // JSON data
      expect(sql).toContain('r."meta"'); // JSON meta
    });
  });

  describe('generateGetRowsQuery Function', () => {
    it('should handle undefined whereConditions', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        undefined,
      );

      expect(sql).toContain('TRUE');
      expect(params).toEqual([table.versionId, 10, 0]);
    });

    it('should include all required SQL components', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const { sql, params } = generateGetRowsQuery(table.versionId, 20, 5, {
        readonly: false,
      });

      // Check SQL structure
      expect(sql).toContain('SELECT');
      expect(sql).toContain('FROM "Row" r');
      expect(sql).toContain('INNER JOIN "_RowToTable" rt');
      expect(sql).toContain('WHERE rt."B" = $1');
      expect(sql).toContain('ORDER BY r."createdAt" DESC');
      expect(sql).toContain('LIMIT $2');
      expect(sql).toContain('OFFSET $3');

      // Check parameters
      expect(params[0]).toBe(table.versionId); // tableId
      expect(params[1]).toBe(20); // take
      expect(params[2]).toBe(5); // skip
      expect(params[3]).toBe(false); // readonly condition
    });

    it('should handle all field selections', async () => {
      const { table } = await createTableWithJsonData(prismaService);

      const { sql } = generateGetRowsQuery(table.versionId, 10, 0);

      // Check all fields are selected
      const expectedFields = [
        'r."versionId"',
        'r."createdId"',
        'r."id"',
        'r."readonly"',
        'r."createdAt"',
        'r."updatedAt"',
        'r."publishedAt"',
        'r."data"',
        'r."meta"',
        'r."hash"',
        'r."schemaHash"',
      ];

      expectedFields.forEach((field) => {
        expect(sql).toContain(field);
      });
    });
  });

  describe('Error Handling Coverage', () => {
    it('should throw error for unsupported ORDER BY field', () => {
      const generator = new WhereGenerator();

      expect(() => {
        generator.generateOrderBy([{ unsupportedField: 'asc' } as any]);
      }).toThrow('Unsupported ORDER BY field: unsupportedField');
    });

    it('should handle getSqlType with all supported types', () => {
      const generator = new WhereGenerator();

      // Test all supported JsonValueType cases
      const testCases = [
        { type: 'text' as const, expected: 'text' },
        { type: 'int' as const, expected: 'int' },
        { type: 'float' as const, expected: 'float' },
        { type: 'boolean' as const, expected: 'boolean' },
        { type: 'timestamp' as const, expected: 'timestamp' },
      ];

      testCases.forEach(({ type, expected }) => {
        const result = (generator as any).getSqlType(type);
        expect(result).toBe(expected);
      });
    });

    it('should handle getSqlType default case', () => {
      const generator = new WhereGenerator();

      // Test default case with invalid type
      const result = (generator as any).getSqlType('invalid-type' as any);
      expect(result).toBe('text');
    });

    it('should handle empty aggregation string in JSON ordering', () => {
      const generator = new WhereGenerator();

      // Test case where aggregation might be empty or undefined
      const result = generator.generateOrderBy([
        {
          data: {
            path: 'test',
            direction: 'asc',
            type: 'text',
            aggregation: undefined,
          },
        },
      ]);

      expect(result).toContain('r."data"');
      expect(result).toContain('ASC');
    });
  });
});
