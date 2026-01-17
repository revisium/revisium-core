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
        result: { type: 'number', default: 42, formula: '(((' },
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
    it('should set type default for number formula field', () => {
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
      expect(result.total).toBe(0);
    });

    it('should set type default for string formula field', () => {
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
        fullName: 'should be cleared',
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { firstName: 'John', fullName: 'should be cleared' },
        schemaStore,
        valueStore,
      });

      expect(valueStore.getPlainValue()).toMatchObject({
        firstName: 'John',
        fullName: '',
      });
    });

    it('should set type default for boolean formula field', () => {
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
        price: 50,
        isExpensive: true,
      });

      plugin.afterCreateRow({
        revisionId: 'rev1',
        tableId: 'table1',
        rowId: 'row1',
        data: { price: 50, isExpensive: true },
        schemaStore,
        valueStore,
      });

      expect(valueStore.getPlainValue()).toMatchObject({
        price: 50,
        isExpensive: false,
      });
    });
  });

  describe('afterUpdateRow', () => {
    it('should set type default for formula field on update', () => {
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
        total: 0,
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

      expect(valueStore.getPlainValue()).toMatchObject({ price: 20, total: 0 });
    });
  });
});
