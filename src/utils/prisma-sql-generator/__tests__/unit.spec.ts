import { WhereGeneratorPrisma } from '../where-generator.prisma';
import { WhereConditions } from '../types';

describe('Prisma SQL Generator - Unit Tests', () => {
  let generator: WhereGeneratorPrisma;

  beforeEach(() => {
    generator = new WhereGeneratorPrisma();
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported StringFilter operations', () => {
      const invalidFilter = { unsupportedOp: 'value' } as any;
      expect(() => {
        generator.generateWhere({ id: invalidFilter });
      }).toThrow('Unsupported StringFilter');
    });

    it('should throw error for unsupported BoolFilter operations', () => {
      const invalidFilter = { unsupportedOp: true } as any;
      expect(() => {
        generator.generateWhere({ readonly: invalidFilter });
      }).toThrow('Unsupported BoolFilter');
    });

    it('should throw error for unsupported DateFilter operations', () => {
      const invalidFilter = { unsupportedOp: '2025-01-01' } as any;
      expect(() => {
        generator.generateWhere({ createdAt: invalidFilter });
      }).toThrow('Unsupported DateFilter');
    });

    it('should throw error for unsupported JsonFilter operations', () => {
      const invalidFilter = { path: ['name'], unsupportedOp: 'value' } as any;
      expect(() => {
        generator.generateWhere({ data: invalidFilter });
      }).toThrow('Unsupported JsonFilter');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null conditions', () => {
      const result = generator.generateWhere(null as any);
      expect(result.inspect().sql).toBe('TRUE');
    });

    it('should handle undefined conditions', () => {
      const result = generator.generateWhere(undefined);
      expect(result.inspect().sql).toBe('TRUE');
    });

    it('should handle empty object conditions', () => {
      const result = generator.generateWhere({});
      expect(result.inspect().sql).toBe('TRUE');
    });

    it('should handle complex nested empty conditions', () => {
      const conditions: WhereConditions = {
        AND: [],
        OR: [],
      };
      const result = generator.generateWhere(conditions);
      expect(result.inspect().sql).toBe('TRUE');
    });
  });

  describe('StringFilter Edge Cases', () => {
    it('should handle empty string values', () => {
      const result = generator.generateWhere({ id: '' });
      expect(result.inspect().sql).toContain('r."id" = ?');
      expect(result.inspect().values).toEqual(['']);
    });

    it('should handle empty arrays in StringFilter', () => {
      const result1 = generator.generateWhere({ id: { in: [] } });
      expect(result1.inspect().sql).toBe('FALSE');

      const result2 = generator.generateWhere({ id: { notIn: [] } });
      expect(result2.inspect().sql).toBe('TRUE');
    });

    it('should handle special characters in StringFilter', () => {
      const result = generator.generateWhere({
        id: { contains: 'test\'with"quotes' },
      });
      expect(result.inspect().sql).toContain('r."id" LIKE ?');
      expect(result.inspect().values).toEqual(['%test\'with"quotes%']);
    });

    it('should handle all StringFilter comparison operators', () => {
      const testCases = [
        { filter: { lt: 'z' }, expected: 'r."id" < ?' },
        { filter: { lte: 'z' }, expected: 'r."id" <= ?' },
        { filter: { gt: 'a' }, expected: 'r."id" > ?' },
        { filter: { gte: 'a' }, expected: 'r."id" >= ?' },
      ];

      testCases.forEach(({ filter, expected }) => {
        const result = generator.generateWhere({ id: filter });
        expect(result.inspect().sql).toContain(expected);
      });
    });

    it('should handle search with full-text terms', () => {
      const result = generator.generateWhere({
        id: { search: 'typescript react nodejs' },
      });
      expect(result.inspect().sql).toContain('to_tsvector');
      expect(result.inspect().sql).toContain('@@');
      expect(result.inspect().sql).toContain('plainto_tsquery');
    });

    it('should validate search term type', () => {
      expect(() => {
        generator.generateWhere({
          id: { search: 123 as any },
        });
      }).toThrow('Full-text search term must be a string');
    });

    it('should validate search term length', () => {
      const longTerm = 'x'.repeat(1001);
      expect(() => {
        generator.generateWhere({
          id: { search: longTerm },
        });
      }).toThrow('Full-text search term too long (max 1000 characters)');
    });

    it('should handle special characters in search safely', () => {
      const result = generator.generateWhere({
        id: { search: 'test\'with"quotes&special<>chars' },
      });
      expect(result.inspect().sql).toContain('plainto_tsquery');
      // plainto_tsquery handles special characters safely
      expect(result.inspect().values).toContain(
        'test\'with"quotes&special<>chars',
      );
    });
  });

  describe('BoolFilter Edge Cases', () => {
    it('should handle BoolFilter with false values', () => {
      const result1 = generator.generateWhere({ readonly: { equals: false } });
      expect(result1.inspect().sql).toContain('r."readonly" = ?');
      expect(result1.inspect().values).toEqual([false]);

      const result2 = generator.generateWhere({ readonly: { not: false } });
      expect(result2.inspect().sql).toContain('r."readonly" != ?');
      expect(result2.inspect().values).toEqual([false]);
    });
  });

  describe('DateFilter Edge Cases', () => {
    it('should handle Date objects in DateFilter', () => {
      const testDate = new Date('2025-01-01T00:00:00Z');

      const result1 = generator.generateWhere({ createdAt: testDate });
      expect(result1.inspect().sql).toContain('r."createdAt" = ?');
      expect(result1.inspect().values).toEqual(['2025-01-01T00:00:00.000Z']);

      const result2 = generator.generateWhere({
        createdAt: { equals: testDate },
      });
      expect(result2.inspect().sql).toContain('r."createdAt" = ?');
    });

    it('should handle empty date arrays', () => {
      const result1 = generator.generateWhere({
        createdAt: { in: [] },
      });
      expect(result1.inspect().sql).toBe('FALSE');

      const result2 = generator.generateWhere({
        createdAt: { notIn: [] },
      });
      expect(result2.inspect().sql).toBe('TRUE');
    });

    it('should handle mixed Date objects and strings in arrays', () => {
      const mixedDates = [
        new Date('2025-01-01T00:00:00Z'),
        '2025-01-02T00:00:00Z',
      ];

      const result = generator.generateWhere({
        createdAt: { in: mixedDates },
      });
      expect(result.inspect().sql).toContain('r."createdAt" IN');
    });
  });

  describe('JsonFilter Edge Cases', () => {
    it('should handle single path arrays', () => {
      const result = generator.generateWhere({
        data: { path: ['name'], equals: 'Alice' },
      });
      expect(result.inspect().sql).toContain('r."data"->>?');
      expect(result.inspect().values).toEqual(['name', 'Alice']);
    });

    it('should handle nested path arrays', () => {
      const result = generator.generateWhere({
        data: { path: ['user', 'profile', 'name'], equals: 'Alice' },
      });
      expect(result.inspect().sql).toContain('r."data"#>>?');
      expect(result.inspect().values).toEqual(['{user,profile,name}', 'Alice']);
    });

    it('should handle JsonFilter with non-string values', () => {
      const testCases = [
        { equals: 42, expected: '42' },
        { equals: true, expected: 'true' },
        { equals: null, expected: 'null' },
        { equals: { obj: 'value' }, expected: '{"obj":"value"}' },
      ];

      testCases.forEach(({ equals, expected }) => {
        const result = generator.generateWhere({
          data: { path: ['field'], equals },
        });
        expect(result.inspect().values).toContain(expected);
      });
    });

    it('should handle JsonFilter case insensitive with non-string equals', () => {
      const result = generator.generateWhere({
        data: {
          path: ['field'],
          equals: 42,
          mode: 'insensitive',
        },
      });
      // Non-strings should not use LOWER()
      expect(result.inspect().sql).toContain('r."data"->>? = ?');
      expect(result.inspect().values).toEqual(['field', '42']);
    });

    it('should handle empty JsonFilter arrays', () => {
      const result1 = generator.generateWhere({
        data: { path: ['tags'], in: [] },
      });
      expect(result1.inspect().sql).toBe('FALSE');

      const result2 = generator.generateWhere({
        data: { path: ['tags'], notIn: [] },
      });
      expect(result2.inspect().sql).toBe('TRUE');
    });

    it('should handle JsonFilter with mixed array types', () => {
      const mixedValues = ['string', 42, true];
      const result = generator.generateWhere({
        data: { path: ['field'], in: mixedValues },
      });
      expect(result.inspect().values).toContain('string');
      expect(result.inspect().values).toContain('42');
      expect(result.inspect().values).toContain('true');
    });

    it('should handle JsonFilter not with non-string values', () => {
      const result = generator.generateWhere({
        data: { path: ['field'], not: 42 },
      });
      expect(result.inspect().sql).toContain('r."data"->>? != ?');
      expect(result.inspect().values).toEqual(['field', '42']);
    });
  });

  describe('ORDER BY Field Validation', () => {
    it('should throw error for invalid field names', () => {
      expect(() => {
        generator.generateOrderBy([{ invalidField: 'asc' }]);
      }).toThrow('Invalid ORDER BY field: invalidField');
    });

    it('should accept all valid field names', () => {
      const validFields = [
        'versionId',
        'createdId',
        'id',
        'hash',
        'schemaHash',
        'readonly',
        'createdAt',
        'updatedAt',
        'publishedAt',
        'data',
        'meta',
      ];

      validFields.forEach((field) => {
        expect(() => {
          generator.generateOrderBy([{ [field]: 'asc' }]);
        }).not.toThrow();
      });
    });

    it('should provide helpful error message with valid field list', () => {
      try {
        generator.generateOrderBy([{ badField: 'asc' }]);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid ORDER BY field: badField');
        expect(error.message).toContain('Allowed fields:');
        expect(error.message).toContain('versionId');
        expect(error.message).toContain('data');
      }
    });
  });

  describe('ORDER BY Edge Cases', () => {
    it('should handle null orderBy', () => {
      const result = generator.generateOrderBy(null as any);
      expect(result.inspect().sql).toContain('r."createdAt" DESC');
    });

    it('should handle undefined orderBy', () => {
      const result = generator.generateOrderBy(undefined);
      expect(result.inspect().sql).toContain('r."createdAt" DESC');
    });

    it('should handle empty orderBy array', () => {
      const result = generator.generateOrderBy([]);
      expect(result.inspect().sql).toContain('r."createdAt" DESC');
    });

    it('should handle orderBy with empty objects', () => {
      const result = generator.generateOrderBy([{}]);
      expect(result.inspect().sql).toContain('r."createdAt" DESC');
    });

    it('should handle JSON orderBy with string path', () => {
      const result = generator.generateOrderBy([
        { data: { path: 'name', direction: 'asc', type: 'text' } },
      ]);
      expect(result.inspect().sql).toContain(
        '(r."data"#>>\'{name}\')::text ASC',
      );
    });

    it('should handle JSON orderBy with array path', () => {
      const result = generator.generateOrderBy([
        { data: { path: ['user', 'name'], direction: 'desc', type: 'text' } },
      ]);
      expect(result.inspect().sql).toContain(
        '(r."data"#>>\'{user,name}\')::text DESC',
      );
    });

    it('should handle JSON orderBy with default values', () => {
      const result = generator.generateOrderBy([
        { data: { path: 'name' } }, // No direction, type, aggregation
      ]);
      expect(result.inspect().sql).toContain(
        '(r."data"#>>\'{name}\')::text ASC',
      );
    });

    it('should handle unknown JSON types', () => {
      const result = generator.generateOrderBy([
        { data: { path: 'field', type: 'unknown' as any } },
      ]);
      expect(result.inspect().sql).toContain('::text'); // Should default to text
    });
  });

  describe('JSON Path Parsing Edge Cases', () => {
    it('should handle various path formats', () => {
      const testCases = [
        // Test through ORDER BY since parseJsonPath is private
        { input: 'simple', expected: '{simple}' },
        { input: 'nested.path', expected: '{nested,path}' },
        { input: '$.name', expected: '{name}' },
        { input: '$.user.profile', expected: '{user,profile}' },
        { input: 'tags[0]', expected: '{tags,0}' },
        { input: 'tags[-1]', expected: '{tags,-1}' },
        { input: 'users[0].name', expected: '{users,0,name}' },
        { input: '$.items[1].price', expected: '{items,1,price}' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = generator.generateOrderBy([
          { data: { path: input, direction: 'asc', type: 'text' } },
        ]);
        expect(result.inspect().sql).toContain(expected);
      });
    });

    it('should handle complex JSONPath expressions', () => {
      const complexPaths = [
        'deep.nested.object.field',
        'array[0].nested.field',
        'complex.array[5].deep.value',
        '$.root[*].field', // Array aggregation
      ];

      complexPaths.forEach((path) => {
        const result = generator.generateOrderBy([
          { data: { path, direction: 'asc', type: 'text' } },
        ]);
        expect(result.inspect().sql).toContain('::text ASC');
      });
    });

    it('should throw error for empty paths', () => {
      expect(() => {
        generator.generateOrderBy([
          { data: { path: '', direction: 'asc', type: 'text' } },
        ]);
      }).toThrow('JSON path cannot be empty');
    });

    it('should handle single character paths', () => {
      const result = generator.generateOrderBy([
        { data: { path: 'x', direction: 'asc', type: 'text' } },
      ]);
      expect(result.inspect().sql).toContain("'{x}'");
    });
  });

  describe('Array Aggregation Edge Cases', () => {
    it('should handle aggregation without wildcard', () => {
      const result = generator.generateOrderBy([
        {
          data: {
            path: 'scores',
            direction: 'desc',
            type: 'int',
            aggregation: 'last',
          },
        },
      ]);
      expect(result.inspect().sql).toContain('{scores,-1}'); // Should add -1 for last
    });

    it('should handle aggregation with wildcard paths', () => {
      const result = generator.generateOrderBy([
        {
          data: {
            path: 'items[*].price',
            direction: 'desc',
            type: 'float',
            aggregation: 'min',
          },
        },
      ]);
      // Should generate proper MIN aggregation SQL, not simplified first element
      expect(result.inspect().sql).toContain('SELECT MIN');
      expect(result.inspect().sql).toContain('jsonb_array_elements');
      expect(result.inspect().sql).toContain('{items}');
      expect(result.inspect().sql).toContain('{price}');
    });

    it('should handle all aggregation types', () => {
      const testCases = [
        { aggregation: 'min', expectedSql: 'SELECT MIN' },
        { aggregation: 'max', expectedSql: 'SELECT MAX' },
        { aggregation: 'avg', expectedSql: 'SELECT AVG' },
        { aggregation: 'first', expectedSql: '{items,0,value}' }, // Fixed to match actual format
        { aggregation: 'last', expectedSql: '{items,-1,value}' }, // Fixed to match actual format
      ];

      testCases.forEach(({ aggregation, expectedSql }) => {
        const result = generator.generateOrderBy([
          {
            data: {
              path: 'items[*].value',
              direction: 'asc',
              type: 'int',
              aggregation: aggregation as any,
            },
          },
        ]);

        expect(result.inspect().sql).toContain(expectedSql);
        expect(result.inspect().sql).toContain('ASC');

        // All should properly cast to int
        expect(result.inspect().sql).toContain('::int');
      });
    });
  });

  describe('Type Casting Coverage', () => {
    it('should handle all JSON value types', () => {
      const types = ['text', 'int', 'float', 'boolean', 'timestamp'];

      types.forEach((type) => {
        const result = generator.generateOrderBy([
          { data: { path: 'field', direction: 'asc', type: type as any } },
        ]);
        expect(result.inspect().sql).toContain(`::${type}`);
      });
    });

    it('should default unknown types to text', () => {
      const result = generator.generateOrderBy([
        { data: { path: 'field', type: 'unknown-type' as any } },
      ]);
      expect(result.inspect().sql).toContain('::text');
    });
  });

  describe('Complex Logical Combinations', () => {
    it('should handle deeply nested AND/OR structures', () => {
      const deepConditions: WhereConditions = {
        AND: [
          {
            OR: [
              { id: 'test1' },
              {
                AND: [
                  { readonly: false },
                  {
                    NOT: {
                      data: { path: ['status'], equals: 'deleted' },
                    },
                  },
                ],
              },
            ],
          },
          {
            OR: [
              { createdAt: { gt: '2025-01-01' } },
              { data: { path: ['priority'], equals: 'high' } },
            ],
          },
        ],
      };

      const result = generator.generateWhere(deepConditions);
      const sql = result.inspect().sql;

      // Should contain all logical operators with proper nesting
      expect(sql).toContain('(');
      expect(sql).toContain(')');
      expect(sql).toContain('AND');
      expect(sql).toContain('OR');
      expect(sql).toContain('NOT');
    });

    it('should handle single element logical arrays', () => {
      const conditions: WhereConditions = {
        AND: [{ id: 'single' }],
        OR: [{ readonly: true }],
      };

      const result = generator.generateWhere(conditions);
      expect(result.inspect().sql).toContain('(r."id" = ?)');
      expect(result.inspect().sql).toContain('(r."readonly" = ?)');
    });

    it('should filter out TRUE clauses in logical operations', () => {
      const conditions: WhereConditions = {
        AND: [
          {}, // This becomes TRUE and should be filtered
          { id: 'test' },
        ],
      };

      const result = generator.generateWhere(conditions);
      // Should not contain double parentheses from filtered TRUE
      expect(result.inspect().sql).not.toMatch(/\(\(\)/);
    });
  });

  describe('generateGetRowsQueryPrisma Edge Cases', () => {
    it('should handle extreme take values', () => {
      const query1 = generator.generateGetRowsQueryPrisma('table-id', {
        take: 0, // Should clamp to 1
      });
      expect(query1.inspect().values).toContain(1);

      const query2 = generator.generateGetRowsQueryPrisma('table-id', {
        take: 1000, // Should clamp to 500
      });
      expect(query2.inspect().values).toContain(500);
    });

    it('should handle negative skip values', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id', {
        skip: -10, // Should clamp to 0
      });
      expect(query.inspect().values).toContain(0);
    });

    it('should handle string numbers in options', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id', {
        take: '25' as any,
        skip: '10' as any,
      });
      expect(query.inspect().values).toContain(25);
      expect(query.inspect().values).toContain(10);
    });

    it('should handle NaN and invalid numbers', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id', {
        take: NaN, // Should default to 50
        skip: 'invalid' as any, // Should clamp to 0
      });
      expect(query.inspect().values).toContain(50);
      expect(query.inspect().values).toContain(0);
    });

    it('should normalize single orderBy to array', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id', {
        orderBy: { createdAt: 'desc' }, // Single object, not array
      });
      expect(query.inspect().sql).toContain('ORDER BY');
      expect(query.inspect().sql).toContain('r."createdAt" DESC');
    });

    it('should handle orderBy array', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id', {
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      expect(query.inspect().sql).toContain('r."createdAt" DESC, r."id" ASC');
    });

    it('should handle empty orderBy array', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id', {
        orderBy: [],
      });
      expect(query.inspect().sql).toContain('r."createdAt" DESC'); // Default
    });
  });

  describe('Legacy Method Coverage', () => {
    it('should support legacy generateGetRowsQuery method', () => {
      const query = generator.generateGetRowsQuery(
        'table-id',
        10,
        5,
        { readonly: false },
        [{ createdAt: 'desc' }],
      );

      expect(query.inspect().sql).toContain('SELECT');
      expect(query.inspect().sql).toContain('WHERE');
      expect(query.inspect().sql).toContain('ORDER BY');
      expect(query.inspect().values).toContain('table-id');
      expect(query.inspect().values).toContain(10);
      expect(query.inspect().values).toContain(5);
      expect(query.inspect().values).toContain(false);
    });

    it('should handle legacy method with undefined parameters', () => {
      const query = generator.generateGetRowsQuery('table-id', 10, 0);
      expect(query.inspect().sql).toContain('TRUE'); // Empty where
      expect(query.inspect().sql).toContain('r."createdAt" DESC'); // Default order
    });
  });

  describe('SQL Structure Validation', () => {
    it('should generate complete SELECT statement', () => {
      const query = generator.generateGetRowsQueryPrisma('table-id');
      const sql = query.inspect().sql;

      // Check all required SQL parts
      expect(sql).toContain('SELECT');
      expect(sql).toContain('r."versionId"');
      expect(sql).toContain('r."createdId"');
      expect(sql).toContain('r."id"');
      expect(sql).toContain('r."readonly"');
      expect(sql).toContain('r."createdAt"');
      expect(sql).toContain('r."updatedAt"');
      expect(sql).toContain('r."publishedAt"');
      expect(sql).toContain('r."data"');
      expect(sql).toContain('r."meta"');
      expect(sql).toContain('r."hash"');
      expect(sql).toContain('r."schemaHash"');
      expect(sql).toContain('FROM "Row" r');
      expect(sql).toContain('INNER JOIN "_RowToTable" rt');
      expect(sql).toContain('rt."A" = r."versionId"');
      expect(sql).toContain('rt."B" = ?');
      expect(sql).toContain('LIMIT ?');
      expect(sql).toContain('OFFSET ?');
    });

    it('should include table ID in parameters', () => {
      const query = generator.generateGetRowsQueryPrisma('test-table-123');
      expect(query.inspect().values).toContain('test-table-123');
    });
  });

  describe('All Field Types Coverage', () => {
    it('should handle all string fields', () => {
      const stringFields = [
        'versionId',
        'createdId',
        'id',
        'hash',
        'schemaHash',
      ];

      stringFields.forEach((field) => {
        const conditions = { [field]: 'test-value' } as WhereConditions;
        const result = generator.generateWhere(conditions);
        expect(result.inspect().sql).toContain(`r."${field}" = ?`);
        expect(result.inspect().values).toContain('test-value');
      });
    });

    it('should handle all date fields', () => {
      const dateFields = ['createdAt', 'updatedAt', 'publishedAt'];

      dateFields.forEach((field) => {
        const conditions = {
          [field]: '2025-01-01T00:00:00Z',
        } as WhereConditions;
        const result = generator.generateWhere(conditions);
        expect(result.inspect().sql).toContain(`r."${field}" = ?`);
      });
    });

    it('should handle both JSON fields', () => {
      const result1 = generator.generateWhere({
        data: { path: ['field'], equals: 'value' },
      });
      expect(result1.inspect().sql).toContain('r."data"');

      const result2 = generator.generateWhere({
        meta: { path: ['field'], equals: 'value' },
      });
      expect(result2.inspect().sql).toContain('r."meta"');
    });
  });
});
