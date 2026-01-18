import { Row } from 'src/__generated__/client';
import { FormulaPlugin } from '../formula.plugin';
import { JsonSchema, JsonValue } from '@revisium/schema-toolkit/types';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';

const createRow = (id: string, data: Record<string, unknown>): Row => ({
  id,
  versionId: `version-${id}`,
  readonly: false,
  hash: 'hash',
  schemaHash: 'schemaHash',
  data: data as JsonValue,
  meta: {} as JsonValue,
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: new Date(),
  createdId: 'createdId',
});

const createSchema = (
  fields: Record<string, { type: string; default: unknown; formula?: string }>,
): JsonSchema =>
  ({
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(fields).map(([name, config]) => [
        name,
        {
          type: config.type,
          default: config.default,
          ...(config.formula && {
            readOnly: true,
            'x-formula': { version: 1, expression: config.formula },
          }),
        },
      ]),
    ),
    additionalProperties: false,
    required: Object.keys(fields),
  }) as JsonSchema;

describe('FormulaPlugin', () => {
  let plugin: FormulaPlugin;
  let jsonSchemaStoreService: JsonSchemaStoreService;

  beforeEach(() => {
    jsonSchemaStoreService = new JsonSchemaStoreService();
    plugin = new FormulaPlugin();
  });

  describe('isAvailable', () => {
    it('should always be available', () => {
      expect(plugin.isAvailable).toBe(true);
    });
  });

  describe('computeRows', () => {
    it('should compute simple formula', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        quantity: { type: 'number', default: 1 },
        total: { type: 'number', default: 0, formula: 'price * quantity' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { price: 10, quantity: 5, total: 0 })];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({
        price: 10,
        quantity: 5,
        total: 50,
      });
    });

    it('should compute chained formulas in correct order', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        taxRate: { type: 'number', default: 0.1 },
        subtotal: { type: 'number', default: 0, formula: 'price' },
        tax: { type: 'number', default: 0, formula: 'subtotal * taxRate' },
        total: { type: 'number', default: 0, formula: 'subtotal + tax' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          price: 100,
          taxRate: 0.2,
          subtotal: 0,
          tax: 0,
          total: 0,
        }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({
        price: 100,
        taxRate: 0.2,
        subtotal: 100,
        tax: 20,
        total: 120,
      });
    });

    it('should compute multiple rows', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        doubled: { type: 'number', default: 0, formula: 'price * 2' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', { price: 10, doubled: 0 }),
        createRow('row2', { price: 20, doubled: 0 }),
        createRow('row3', { price: 30, doubled: 0 }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ price: 10, doubled: 20 });
      expect(rows[1]?.data).toMatchObject({ price: 20, doubled: 40 });
      expect(rows[2]?.data).toMatchObject({ price: 30, doubled: 60 });
    });

    it('should skip computation when no formulas in schema', () => {
      const schema = createSchema({
        name: { type: 'string', default: '' },
        price: { type: 'number', default: 0 },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { name: 'test', price: 10 })];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ name: 'test', price: 10 });
    });

    it('should return formula errors when formula has syntax error', () => {
      const schema = createSchema({
        value: { type: 'number', default: 0 },
        result: { type: 'number', default: 0, formula: '(((' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { value: 10, result: 0 })];

      const result = plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(result.formulaErrors).toBeDefined();
      expect(result.formulaErrors?.get('row1')).toBeDefined();
      expect(result.formulaErrors?.get('row1')?.[0]).toMatchObject({
        field: 'result',
        expression: '(((',
        defaultUsed: true,
      });
    });

    it('should return empty result when no errors', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        doubled: { type: 'number', default: 0, formula: 'price * 2' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { price: 10, doubled: 0 })];

      const result = plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(result.formulaErrors).toBeUndefined();
    });

    it('should compute boolean formula', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        isExpensive: {
          type: 'boolean',
          default: false,
          formula: 'price > 100',
        },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', { price: 50, isExpensive: false }),
        createRow('row2', { price: 150, isExpensive: false }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ price: 50, isExpensive: false });
      expect(rows[1]?.data).toMatchObject({ price: 150, isExpensive: true });
    });

    it('should compute string formula with concat', () => {
      const schema = createSchema({
        firstName: { type: 'string', default: '' },
        lastName: { type: 'string', default: '' },
        fullName: {
          type: 'string',
          default: '',
          formula: 'concat(firstName, " ", lastName)',
        },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', { firstName: 'John', lastName: 'Doe', fullName: '' }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
      });
    });

    it('should set default value when formula fails', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        result: { type: 'number', default: 0, formula: '(((' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { price: 10, result: 999 })];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect((rows[0]?.data as Record<string, unknown>).result).toBe(0);
    });

    it('should propagate failure to dependent formulas', () => {
      const schema = createSchema({
        value: { type: 'number', default: 0 },
        a: { type: 'number', default: 10, formula: '(((' },
        b: { type: 'number', default: 20, formula: 'a * 2' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { value: 5, a: 0, b: 0 })];

      const result = plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(result.formulaErrors).toBeDefined();
      const errors = result.formulaErrors?.get('row1');
      expect(errors).toHaveLength(2);

      expect(errors?.[0]).toMatchObject({
        field: 'a',
        defaultUsed: true,
      });
      expect(errors?.[1]).toMatchObject({
        field: 'b',
        error: 'Dependency formula failed',
        defaultUsed: true,
      });

      const data = rows[0]?.data as Record<string, unknown>;
      expect(data.a).toBe(0);
      expect(data.b).toBe(0);
    });

    it('should throw error on cyclic dependencies', () => {
      const schema = createSchema({
        a: { type: 'number', default: 0, formula: 'b + 1' },
        b: { type: 'number', default: 0, formula: 'a + 1' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { a: 0, b: 0 })];

      expect(() =>
        plugin.computeRows({
          revisionId: 'rev1',
          tableId: 'table1',
          rows,
          schemaStore,
        }),
      ).toThrow('Cyclic dependency detected in formulas');
    });
  });

  describe('afterMigrateRows', () => {
    it('should compute formulas after migration', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        doubled: { type: 'number', default: 0, formula: 'price * 2' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { price: 25, doubled: 0 })];

      plugin.afterMigrateRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ price: 25, doubled: 50 });
    });
  });

  describe('afterCreateRow', () => {
    it('should compute number formula field', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        total: { type: 'number', default: 0, formula: 'price * 2' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        price: 10,
        total: 999,
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { price: 10, total: 999 },
        schemaStore,
        valueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      expect(result.total).toBe(20);
    });

    it('should compute string formula field', () => {
      const schema = createSchema({
        firstName: { type: 'string', default: '' },
        fullName: {
          type: 'string',
          default: '',
          formula: 'concat(firstName, " Doe")',
        },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        firstName: 'John',
        fullName: 'should be computed',
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { firstName: 'John', fullName: 'should be computed' },
        schemaStore,
        valueStore,
      });

      expect(valueStore.getPlainValue()).toMatchObject({
        firstName: 'John',
        fullName: 'John Doe',
      });
    });

    it('should compute boolean formula field', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        isExpensive: {
          type: 'boolean',
          default: false,
          formula: 'price > 100',
        },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        price: 150,
        isExpensive: false,
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { price: 150, isExpensive: false },
        schemaStore,
        valueStore,
      });

      expect(valueStore.getPlainValue()).toMatchObject({
        price: 150,
        isExpensive: true,
      });
    });

    it('should compute chained formulas in correct order', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        tax: { type: 'number', default: 0, formula: 'price * 0.1' },
        total: { type: 'number', default: 0, formula: 'price + tax' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        price: 100,
        tax: 0,
        total: 0,
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { price: 100, tax: 0, total: 0 },
        schemaStore,
        valueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      expect(result.tax).toBe(10);
      expect(result.total).toBe(110);
    });

    it('should set default when formula fails', () => {
      const schema = createSchema({
        value: { type: 'number', default: 0 },
        result: { type: 'number', default: 42, formula: '(((' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        value: 10,
        result: 999,
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { value: 10, result: 999 },
        schemaStore,
        valueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      expect(result.result).toBe(0);
    });

    it('should compute array item formulas', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                doubled: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * 2' },
                },
              },
              additionalProperties: false,
              required: ['price', 'doubled'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        items: [
          { price: 10, doubled: 0 },
          { price: 20, doubled: 0 },
        ],
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: {
          items: [
            { price: 10, doubled: 0 },
            { price: 20, doubled: 0 },
          ],
        },
        schemaStore,
        valueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      const items = result.items as Array<Record<string, unknown>>;
      expect(items[0]?.doubled).toBe(20);
      expect(items[1]?.doubled).toBe(40);
    });
  });

  describe('afterUpdateRow', () => {
    it('should compute formula field on update', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        total: { type: 'number', default: 0, formula: 'price * 2' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        price: 20,
        total: 999,
      });
      const previousValueStore = createJsonValueStore(schemaStore, '', {
        price: 10,
        total: 20,
      });

      plugin.afterUpdateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { price: 20, total: 999 },
        schemaStore,
        valueStore,
        previousValueStore,
      });

      expect(valueStore.getPlainValue()).toMatchObject({
        price: 20,
        total: 40,
      });
    });

    it('should compute chained formulas on update', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        tax: { type: 'number', default: 0, formula: 'price * 0.2' },
        total: { type: 'number', default: 0, formula: 'price + tax' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        price: 200,
        tax: 0,
        total: 0,
      });
      const previousValueStore = createJsonValueStore(schemaStore, '', {
        price: 100,
        tax: 10,
        total: 110,
      });

      plugin.afterUpdateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { price: 200, tax: 0, total: 0 },
        schemaStore,
        valueStore,
        previousValueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      expect(result.tax).toBe(40);
      expect(result.total).toBe(240);
    });

    it('should set default when formula fails on update', () => {
      const schema = createSchema({
        value: { type: 'number', default: 0 },
        result: { type: 'number', default: 0, formula: '(((' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        value: 20,
        result: 999,
      });
      const previousValueStore = createJsonValueStore(schemaStore, '', {
        value: 10,
        result: 0,
      });

      plugin.afterUpdateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { value: 20, result: 999 },
        schemaStore,
        valueStore,
        previousValueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      expect(result.result).toBe(0);
    });

    it('should compute array item formulas on update', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                doubled: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * 2' },
                },
              },
              additionalProperties: false,
              required: ['price', 'doubled'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const valueStore = createJsonValueStore(schemaStore, '', {
        items: [
          { price: 30, doubled: 0 },
          { price: 40, doubled: 0 },
        ],
      });
      const previousValueStore = createJsonValueStore(schemaStore, '', {
        items: [
          { price: 10, doubled: 20 },
          { price: 20, doubled: 40 },
        ],
      });

      plugin.afterUpdateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: {
          items: [
            { price: 30, doubled: 0 },
            { price: 40, doubled: 0 },
          ],
        },
        schemaStore,
        valueStore,
        previousValueStore,
      });

      const result = valueStore.getPlainValue() as Record<string, unknown>;
      const items = result.items as Array<Record<string, unknown>>;
      expect(items[0]?.doubled).toBe(60);
      expect(items[1]?.doubled).toBe(80);
    });
  });

  describe('nested object formulas', () => {
    it('should compute formula in nested object', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          rootValue: { type: 'number', default: 0 },
          nested: {
            type: 'object',
            properties: {
              computed: {
                type: 'number',
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: 'rootValue * 2' },
              },
            },
            additionalProperties: false,
            required: ['computed'],
          },
        },
        additionalProperties: false,
        required: ['rootValue', 'nested'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', { rootValue: 50, nested: { computed: 0 } }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({
        rootValue: 50,
        nested: { computed: 100 },
      });
    });

    it('should compute formula in deeply nested object', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          base: { type: 'number', default: 0 },
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  result: {
                    type: 'number',
                    default: 0,
                    readOnly: true,
                    'x-formula': { version: 1, expression: 'base * 3' },
                  },
                },
                additionalProperties: false,
                required: ['result'],
              },
            },
            additionalProperties: false,
            required: ['level2'],
          },
        },
        additionalProperties: false,
        required: ['base', 'level1'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          base: 10,
          level1: { level2: { result: 0 } },
        }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({
        base: 10,
        level1: { level2: { result: 30 } },
      });
    });
  });

  describe('array item formulas', () => {
    it('should compute formula in array items', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                quantity: { type: 'number', default: 1 },
                total: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
              },
              additionalProperties: false,
              required: ['price', 'quantity', 'total'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          items: [
            { price: 10, quantity: 2, total: 0 },
            { price: 20, quantity: 3, total: 0 },
            { price: 5, quantity: 10, total: 0 },
          ],
        }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      const data = rows[0]?.data as Record<string, unknown>;
      const items = data.items as Array<Record<string, unknown>>;

      expect(items[0]?.total).toBe(20);
      expect(items[1]?.total).toBe(60);
      expect(items[2]?.total).toBe(50);
    });

    it('should handle empty array', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number', default: 0 },
                doubled: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'value * 2' },
                },
              },
              additionalProperties: false,
              required: ['value', 'doubled'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { items: [] })];

      const result = plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(result.formulaErrors).toBeUndefined();
      expect(rows[0]?.data).toMatchObject({ items: [] });
    });
  });

  describe('fields named like functions', () => {
    it('should allow field named max with max function', () => {
      const schema = createSchema({
        max: { type: 'number', default: 0 },
        result: { type: 'number', default: 0, formula: 'max(max, 0)' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { max: 100, result: 0 })];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ max: 100, result: 100 });
    });

    it('should allow field named min with min function', () => {
      const schema = createSchema({
        min: { type: 'number', default: 0 },
        limit: { type: 'number', default: 0 },
        result: { type: 'number', default: 0, formula: 'min(min, limit)' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { min: 50, limit: 100, result: 0 })];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ min: 50, limit: 100, result: 50 });
    });

    it('should allow complex expression with function-named fields', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          max: { type: 'number', default: 0 },
          field: {
            type: 'object',
            properties: {
              min: { type: 'number', default: 0 },
            },
            additionalProperties: false,
            required: ['min'],
          },
          result: {
            type: 'number',
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'max(max - field.min, 0)' },
          },
        },
        additionalProperties: false,
        required: ['max', 'field', 'result'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', { max: 100, field: { min: 20 }, result: 0 }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({
        max: 100,
        field: { min: 20 },
        result: 80,
      });
    });

    it('should allow field named round with round function', () => {
      const schema = createSchema({
        round: { type: 'number', default: 0 },
        result: { type: 'number', default: 0, formula: 'round(round * 2)' },
      });

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [createRow('row1', { round: 3.7, result: 0 })];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      expect(rows[0]?.data).toMatchObject({ round: 3.7, result: 7 });
    });
  });

  describe('negative array index', () => {
    it('should support negative array index', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          values: {
            type: 'array',
            items: { type: 'number', default: 0 },
            default: [],
          },
          lastValue: {
            type: 'number',
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'values[-1]' },
          },
          secondLast: {
            type: 'number',
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'values[-2]' },
          },
        },
        additionalProperties: false,
        required: ['values', 'lastValue', 'secondLast'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          values: [10, 20, 30],
          lastValue: 0,
          secondLast: 0,
        }),
      ];

      const result = plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      const data = rows[0]?.data as Record<string, unknown>;
      expect(result.formulaErrors).toBeUndefined();
      expect(data.lastValue).toBe(30);
      expect(data.secondLast).toBe(20);
    });
  });

  describe('path references', () => {
    it('should resolve root path /field in array item formula', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          taxRate: { type: 'number', default: 0 },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                priceWithTax: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': {
                    version: 1,
                    expression: 'price * (1 + /taxRate)',
                  },
                },
              },
              additionalProperties: false,
              required: ['price', 'priceWithTax'],
            },
          },
        },
        additionalProperties: false,
        required: ['taxRate', 'items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          taxRate: 0.1,
          items: [
            { price: 100, priceWithTax: 0 },
            { price: 200, priceWithTax: 0 },
          ],
        }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      const data = rows[0]?.data as Record<string, unknown>;
      const items = data.items as Array<Record<string, unknown>>;

      expect(items[0]?.priceWithTax).toBeCloseTo(110);
      expect(items[1]?.priceWithTax).toBeCloseTo(220);
    });

    it('should resolve relative path ../field in array item formula', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          discount: { type: 'number', default: 0 },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                discountedPrice: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': {
                    version: 1,
                    expression: 'price * (1 - ../discount)',
                  },
                },
              },
              additionalProperties: false,
              required: ['price', 'discountedPrice'],
            },
          },
        },
        additionalProperties: false,
        required: ['discount', 'items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          discount: 0.2,
          items: [
            { price: 100, discountedPrice: 0 },
            { price: 50, discountedPrice: 0 },
          ],
        }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      const data = rows[0]?.data as Record<string, unknown>;
      const items = data.items as Array<Record<string, unknown>>;

      expect(items[0]?.discountedPrice).toBeCloseTo(80);
      expect(items[1]?.discountedPrice).toBeCloseTo(40);
    });

    it('should resolve nested root path /config.tax', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              tax: { type: 'number', default: 0 },
            },
            additionalProperties: false,
            required: ['tax'],
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                total: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': {
                    version: 1,
                    expression: 'price * (1 + /config.tax)',
                  },
                },
              },
              additionalProperties: false,
              required: ['price', 'total'],
            },
          },
        },
        additionalProperties: false,
        required: ['config', 'items'],
      } as JsonSchema;

      const schemaStore = jsonSchemaStoreService.create(schema);
      const rows = [
        createRow('row1', {
          config: { tax: 0.15 },
          items: [{ price: 100, total: 0 }],
        }),
      ];

      plugin.computeRows({
        revisionId: 'rev1',
        tableId: 'table1',
        rows,
        schemaStore,
      });

      const data = rows[0]?.data as Record<string, unknown>;
      const items = data.items as Array<Record<string, unknown>>;

      expect(items[0]?.total).toBeCloseTo(115);
    });
  });
});
