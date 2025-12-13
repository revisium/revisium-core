import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import {
  JsonObjectSchema,
  JsonSchema,
  JsonSchemaTypeName,
} from '@revisium/schema-toolkit/types';
import { SystemColumnMappingService } from '../system-column-mapping.service';

describe('SystemColumnMappingService', () => {
  let service: SystemColumnMappingService;

  beforeEach(() => {
    service = new SystemColumnMappingService();
  });

  const createSchema = (
    fields: Record<string, string | 'regular'>,
  ): JsonObjectSchema => ({
    type: JsonSchemaTypeName.Object,
    properties: Object.fromEntries(
      Object.entries(fields).map(([name, value]) => [
        name,
        value === 'regular'
          ? { type: JsonSchemaTypeName.String, default: '' }
          : { $ref: value },
      ]),
    ),
    additionalProperties: false as const,
    required: Object.keys(fields),
  });

  describe('mapWhereConditions', () => {
    it('should return undefined when where is undefined', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });

      expect(service.mapWhereConditions(undefined, schema)).toBeUndefined();
    });

    describe.each([
      ['RowId', SystemSchemaIds.RowId, 'id'],
      ['RowCreatedId', SystemSchemaIds.RowCreatedId, 'createdId'],
      ['RowVersionId', SystemSchemaIds.RowVersionId, 'versionId'],
      ['RowCreatedAt', SystemSchemaIds.RowCreatedAt, 'createdAt'],
      ['RowUpdatedAt', SystemSchemaIds.RowUpdatedAt, 'updatedAt'],
      ['RowPublishedAt', SystemSchemaIds.RowPublishedAt, 'publishedAt'],
    ])('%s mapping', (_name, schemaId, column) => {
      it(`should map data.field to ${column}`, () => {
        const schema = createSchema({ field: schemaId });
        const where = { data: { path: 'field', equals: 'value' } };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({ [column]: { equals: 'value' } });
      });
    });

    it('should not map regular fields without $ref', () => {
      const schema = createSchema({ title: 'regular' });
      const where = { data: { path: 'title', string_contains: 'test' } };

      const result = service.mapWhereConditions(where, schema);

      expect(result).toEqual(where);
    });

    describe('logical operators', () => {
      it('should handle AND conditions', () => {
        const schema = createSchema({
          createdAt: SystemSchemaIds.RowCreatedAt,
          title: 'regular',
        });
        const where = {
          AND: [
            { data: { path: 'createdAt', gte: '2024-01-01' } },
            { data: { path: 'title', string_contains: 'test' } },
          ],
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({
          AND: [
            { createdAt: { gte: '2024-01-01' } },
            { data: { path: 'title', string_contains: 'test' } },
          ],
        });
      });

      it('should handle OR conditions', () => {
        const schema = createSchema({
          rowId: SystemSchemaIds.RowId,
          versionId: SystemSchemaIds.RowVersionId,
        });
        const where = {
          OR: [
            { data: { path: 'rowId', equals: 'id-1' } },
            { data: { path: 'versionId', equals: 'v-1' } },
          ],
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({
          OR: [{ id: { equals: 'id-1' } }, { versionId: { equals: 'v-1' } }],
        });
      });

      it('should handle NOT as object', () => {
        const schema = createSchema({
          createdAt: SystemSchemaIds.RowCreatedAt,
        });
        const where = {
          NOT: { data: { path: 'createdAt', lt: '2024-01-01' } },
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({
          NOT: { createdAt: { lt: '2024-01-01' } },
        });
      });

      it('should handle NOT as array', () => {
        const schema = createSchema({
          createdAt: SystemSchemaIds.RowCreatedAt,
          updatedAt: SystemSchemaIds.RowUpdatedAt,
        });
        const where = {
          NOT: [
            { data: { path: 'createdAt', lt: '2024-01-01' } },
            { data: { path: 'updatedAt', gt: '2024-12-01' } },
          ],
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({
          NOT: [
            { createdAt: { lt: '2024-01-01' } },
            { updatedAt: { gt: '2024-12-01' } },
          ],
        });
      });

      it('should handle nested logical operators', () => {
        const schema = createSchema({
          id: SystemSchemaIds.RowId,
          createdAt: SystemSchemaIds.RowCreatedAt,
          updatedAt: SystemSchemaIds.RowUpdatedAt,
        });
        const where = {
          AND: [
            {
              OR: [
                { data: { path: 'id', equals: 'id-1' } },
                { data: { path: 'id', equals: 'id-2' } },
              ],
            },
            {
              NOT: { data: { path: 'createdAt', lt: '2024-01-01' } },
            },
          ],
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({
          AND: [
            {
              OR: [{ id: { equals: 'id-1' } }, { id: { equals: 'id-2' } }],
            },
            {
              NOT: { createdAt: { lt: '2024-01-01' } },
            },
          ],
        });
      });
    });

    describe('path formats', () => {
      it('should handle path as string', () => {
        const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });
        const where = { data: { path: 'field', gte: '2024-01-01' } };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({ createdAt: { gte: '2024-01-01' } });
      });

      it('should handle path as array', () => {
        const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });
        const where = { data: { path: ['field'], gte: '2024-01-01' } };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({ createdAt: { gte: '2024-01-01' } });
      });

      it('should handle nested path (maps by first segment)', () => {
        const schema = createSchema({ metadata: SystemSchemaIds.RowCreatedAt });
        const where = {
          data: { path: 'metadata.nested.field', equals: 'test' },
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({ createdAt: { equals: 'test' } });
      });
    });

    it('should preserve non-data fields', () => {
      const schema = createSchema({ createdAt: SystemSchemaIds.RowCreatedAt });
      const where = {
        id: { equals: 'test-id' },
        data: { path: 'createdAt', gte: '2024-01-01' },
      };

      const result = service.mapWhereConditions(where, schema);

      expect(result).toEqual({
        id: { equals: 'test-id' },
        createdAt: { gte: '2024-01-01' },
      });
    });

    describe('filter key conversion', () => {
      it('should convert string_contains to contains', () => {
        const schema = createSchema({ rowId: SystemSchemaIds.RowId });
        const where = { data: { path: 'rowId', string_contains: 'test' } };

        expect(service.mapWhereConditions(where, schema)).toEqual({
          id: { contains: 'test' },
        });
      });

      it('should convert string_starts_with to startsWith', () => {
        const schema = createSchema({ rowId: SystemSchemaIds.RowId });
        const where = { data: { path: 'rowId', string_starts_with: 'test' } };

        expect(service.mapWhereConditions(where, schema)).toEqual({
          id: { startsWith: 'test' },
        });
      });

      it('should convert string_ends_with to endsWith', () => {
        const schema = createSchema({ rowId: SystemSchemaIds.RowId });
        const where = { data: { path: 'rowId', string_ends_with: 'test' } };

        expect(service.mapWhereConditions(where, schema)).toEqual({
          id: { endsWith: 'test' },
        });
      });

      it('should preserve other filter keys unchanged', () => {
        const schema = createSchema({
          createdAt: SystemSchemaIds.RowCreatedAt,
        });
        const where = {
          data: { path: 'createdAt', gte: '2024-01-01', lt: '2024-12-31' },
        };

        const result = service.mapWhereConditions(where, schema);

        expect(result).toEqual({
          createdAt: { gte: '2024-01-01', lt: '2024-12-31' },
        });
      });
    });
  });

  describe('mapOrderByConditions', () => {
    it('should return undefined when orderBy is undefined', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });

      expect(service.mapOrderByConditions(undefined, schema)).toBeUndefined();
    });

    it('should return undefined when orderBy is empty array', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });

      expect(service.mapOrderByConditions([], schema)).toBeUndefined();
    });

    describe.each([
      ['RowId', SystemSchemaIds.RowId, 'id'],
      ['RowCreatedAt', SystemSchemaIds.RowCreatedAt, 'createdAt'],
      ['RowUpdatedAt', SystemSchemaIds.RowUpdatedAt, 'updatedAt'],
    ])('%s mapping', (_name, schemaId, column) => {
      it(`should map data.field to ${column}`, () => {
        const schema = createSchema({ field: schemaId });
        const orderBy = [
          { data: { path: 'field', direction: 'desc' as const } },
        ];

        const result = service.mapOrderByConditions(orderBy, schema);

        expect(result).toEqual([{ [column]: 'desc' }]);
      });
    });

    it('should default to asc when direction is not specified', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });
      const orderBy = [{ data: { path: 'field' } }];

      const result = service.mapOrderByConditions(orderBy, schema);

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });

    it('should not map regular fields without $ref', () => {
      const schema = createSchema({ title: 'regular' });
      const orderBy = [{ data: { path: 'title', direction: 'asc' as const } }];

      const result = service.mapOrderByConditions(orderBy, schema);

      expect(result).toEqual(orderBy);
    });

    it('should handle multiple orderBy conditions', () => {
      const schema = createSchema({
        createdAt: SystemSchemaIds.RowCreatedAt,
        updatedAt: SystemSchemaIds.RowUpdatedAt,
      });
      const orderBy = [
        { data: { path: 'createdAt', direction: 'desc' as const } },
        { data: { path: 'updatedAt', direction: 'asc' as const } },
      ];

      const result = service.mapOrderByConditions(orderBy, schema);

      expect(result).toEqual([{ createdAt: 'desc' }, { updatedAt: 'asc' }]);
    });

    it('should preserve non-data fields', () => {
      const schema = createSchema({ createdAt: SystemSchemaIds.RowCreatedAt });
      const orderBy = [
        { id: 'desc' as const },
        { data: { path: 'createdAt', direction: 'asc' as const } },
      ];

      const result = service.mapOrderByConditions(orderBy, schema);

      expect(result).toEqual([{ id: 'desc' }, { createdAt: 'asc' }]);
    });

    it('should handle path as array', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowCreatedAt });
      const orderBy = [
        { data: { path: ['field'], direction: 'desc' as const } },
      ];

      const result = service.mapOrderByConditions(orderBy, schema);

      expect(result).toEqual([{ createdAt: 'desc' }]);
    });
  });

  describe('edge cases', () => {
    it('should not map $ref that is not a system schema', () => {
      const schema = createSchema({ file: SystemSchemaIds.File });
      const where = { data: { path: 'file', equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });

    it('should not map when schema has no properties', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {},
        additionalProperties: false,
        required: [],
      };
      const where = { data: { path: 'unknownField', equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });

    it('should not map when schema is not object type', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.String,
        default: '',
      };
      const where = { data: { path: 'field', equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });

    it('should not map when schema is $ref at root level', () => {
      const schema: JsonSchema = { $ref: SystemSchemaIds.RowId };
      const where = { data: { path: 'field', equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });

    it('should not map when field is not found in schema', () => {
      const schema = createSchema({ existingField: SystemSchemaIds.RowId });
      const where = { data: { path: 'nonExistentField', equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });

    it('should handle empty path array', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowId });
      const where = { data: { path: [], equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });

    it('should handle empty string path', () => {
      const schema = createSchema({ field: SystemSchemaIds.RowId });
      const where = { data: { path: '', equals: 'test' } };

      expect(service.mapWhereConditions(where, schema)).toEqual(where);
    });
  });
});
