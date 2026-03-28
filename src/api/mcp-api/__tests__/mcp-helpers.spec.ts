import {
  compactRow,
  compactRowEdges,
  fillFormulaDefaults,
} from '../tools/mcp-helpers';

describe('compactRow', () => {
  it('keeps only id and data', () => {
    const row = {
      id: 'row-1',
      data: { name: 'Test' },
      versionId: 'v1',
      createdId: 'c1',
      hash: 'abc',
      schemaHash: 'def',
      meta: {},
      context: { revisionId: 'r1', tableId: 't1' },
      publishedAt: '2026-01-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      readonly: false,
    };
    const result = compactRow(row);
    expect(result).toEqual({ id: 'row-1', data: { name: 'Test' } });
    expect(result).not.toHaveProperty('versionId');
    expect(result).not.toHaveProperty('hash');
    expect(result).not.toHaveProperty('schemaHash');
    expect(result).not.toHaveProperty('meta');
    expect(result).not.toHaveProperty('context');
  });

  it('includes formulaErrors when present', () => {
    const row = {
      id: 'row-1',
      data: { total: 0 },
      formulaErrors: [{ fieldPath: 'total', error: 'Division by zero' }],
    };
    const result = compactRow(row);
    expect(result).toEqual({
      id: 'row-1',
      data: { total: 0 },
      formulaErrors: [{ fieldPath: 'total', error: 'Division by zero' }],
    });
  });

  it('omits formulaErrors when empty', () => {
    const row = { id: 'row-1', data: {}, formulaErrors: [] };
    const result = compactRow(row);
    expect(result).not.toHaveProperty('formulaErrors');
  });
});

describe('compactRowEdges', () => {
  it('compacts all nodes in edges', () => {
    const result = compactRowEdges({
      edges: [
        {
          cursor: 'abc',
          node: {
            id: 'r1',
            data: { x: 1 },
            versionId: 'v1',
            hash: 'h1',
          },
        },
        {
          cursor: 'def',
          node: {
            id: 'r2',
            data: { x: 2 },
            versionId: 'v2',
            hash: 'h2',
          },
        },
      ],
      pageInfo: { hasNextPage: false },
      totalCount: 2,
    });
    expect(result.edges[0].node).toEqual({ id: 'r1', data: { x: 1 } });
    expect(result.edges[1].node).toEqual({ id: 'r2', data: { x: 2 } });
    expect(result.edges[0].cursor).toBe('abc');
    expect(result.totalCount).toBe(2);
  });
});

describe('fillFormulaDefaults', () => {
  it('fills missing formula field with default', () => {
    const schema = {
      properties: {
        price: { type: 'number', default: 0 },
        quantity: { type: 'number', default: 0 },
        total: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'price * quantity' },
        },
      },
    };
    const data = { price: 100, quantity: 5 };
    const result = fillFormulaDefaults(schema, data);
    expect(result).toEqual({ price: 100, quantity: 5, total: 0 });
  });

  it('does not overwrite existing formula field value', () => {
    const schema = {
      properties: {
        total: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'a + b' },
        },
      },
    };
    const data = { total: 999 };
    const result = fillFormulaDefaults(schema, data);
    expect(result).toEqual({ total: 999 });
  });

  it('does not modify non-formula fields', () => {
    const schema = {
      properties: {
        name: { type: 'string', default: '' },
        count: { type: 'number', default: 0 },
      },
    };
    const data = { name: 'Test' };
    const result = fillFormulaDefaults(schema, data);
    expect(result).toEqual({ name: 'Test' });
  });

  it('fills formula defaults in nested objects', () => {
    const schema = {
      properties: {
        stats: {
          type: 'object',
          properties: {
            base: { type: 'number', default: 0 },
            computed: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'base * 2' },
            },
          },
        },
      },
    };
    const data = { stats: { base: 10 } };
    const result = fillFormulaDefaults(schema, data);
    expect(result).toEqual({ stats: { base: 10, computed: 0 } });
  });

  it('fills formula defaults in array item objects', () => {
    const schema = {
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              qty: { type: 'number', default: 0 },
              price: { type: 'number', default: 0 },
              lineTotal: {
                type: 'number',
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: 'qty * price' },
              },
            },
          },
        },
      },
    };
    const data = {
      items: [
        { qty: 2, price: 50 },
        { qty: 3, price: 100 },
      ],
    };
    const result = fillFormulaDefaults(schema, data);
    expect(result).toEqual({
      items: [
        { qty: 2, price: 50, lineTotal: 0 },
        { qty: 3, price: 100, lineTotal: 0 },
      ],
    });
  });

  it('handles string and boolean formula defaults', () => {
    const schema = {
      properties: {
        label: {
          type: 'string',
          default: '',
          readOnly: true,
          'x-formula': { version: 1, expression: 'name' },
        },
        isValid: {
          type: 'boolean',
          default: false,
          readOnly: true,
          'x-formula': { version: 1, expression: 'count > 0' },
        },
      },
    };
    const data = {};
    const result = fillFormulaDefaults(schema, data);
    expect(result).toEqual({ label: '', isValid: false });
  });

  it('returns data unchanged if no properties', () => {
    const result = fillFormulaDefaults({}, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});
