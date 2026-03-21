import {
  coerceStringifiedArgs,
  coerceJsonRpcBody,
} from '../coerce-stringified-args';

describe('coerceStringifiedArgs', () => {
  describe('when arguments are correct (no coercion needed)', () => {
    it('should return undefined as-is', () => {
      expect(coerceStringifiedArgs(undefined)).toBeUndefined();
    });

    it('should return empty object as-is', () => {
      expect(coerceStringifiedArgs({})).toEqual({});
    });

    it('should not touch string values', () => {
      const args = { revisionId: 'abc', tableId: 'posts' };
      expect(coerceStringifiedArgs(args)).toEqual(args);
    });

    it('should not touch number values', () => {
      const args = { first: 50 };
      expect(coerceStringifiedArgs(args)).toEqual({ first: 50 });
    });

    it('should not touch boolean values', () => {
      const args = { includeRowData: true };
      expect(coerceStringifiedArgs(args)).toEqual({ includeRowData: true });
    });

    it('should not touch native object values', () => {
      const args = { data: { title: 'test', count: 5 } };
      expect(coerceStringifiedArgs(args)).toEqual(args);
    });

    it('should not touch native array values', () => {
      const args = {
        patches: [{ op: 'replace', path: 'title', value: 'New' }],
      };
      expect(coerceStringifiedArgs(args)).toEqual(args);
    });
  });

  describe('when string values are stringified JSON objects', () => {
    it('should parse stringified object in data field', () => {
      const args = {
        revisionId: 'abc',
        tableId: 'posts',
        rowId: 'row-1',
        data: '{"title":"test","description":"hello"}',
      };
      expect(coerceStringifiedArgs(args)).toEqual({
        revisionId: 'abc',
        tableId: 'posts',
        rowId: 'row-1',
        data: { title: 'test', description: 'hello' },
      });
    });

    it('should parse stringified array in patches field', () => {
      const args = {
        revisionId: 'abc',
        tableId: 'posts',
        rowId: 'row-1',
        patches: '[{"op":"replace","path":"title","value":"New"}]',
      };
      expect(coerceStringifiedArgs(args)).toEqual({
        revisionId: 'abc',
        tableId: 'posts',
        rowId: 'row-1',
        patches: [{ op: 'replace', path: 'title', value: 'New' }],
      });
    });

    it('should parse stringified array in rows field', () => {
      const args = {
        revisionId: 'abc',
        tableId: 'posts',
        rows: '[{"rowId":"r1","data":{"title":"test"}}]',
      };
      expect(coerceStringifiedArgs(args)).toEqual({
        revisionId: 'abc',
        tableId: 'posts',
        rows: [{ rowId: 'r1', data: { title: 'test' } }],
      });
    });

    it('should parse stringified object in where field', () => {
      const args = {
        revisionId: 'abc',
        tableId: 'posts',
        where: '{"data":{"path":"price","gte":100}}',
      };
      expect(coerceStringifiedArgs(args)).toEqual({
        revisionId: 'abc',
        tableId: 'posts',
        where: { data: { path: 'price', gte: 100 } },
      });
    });

    it('should parse stringified object in schema field', () => {
      const args = {
        revisionId: 'abc',
        tableId: 'posts',
        schema:
          '{"type":"object","properties":{"title":{"type":"string","default":""}},"additionalProperties":false,"required":["title"]}',
      };
      const result = coerceStringifiedArgs(args)!;
      expect(result.schema).toEqual({
        type: 'object',
        properties: { title: { type: 'string', default: '' } },
        additionalProperties: false,
        required: ['title'],
      });
    });
  });

  describe('should NOT parse plain strings that are not JSON', () => {
    it('should not touch regular string values', () => {
      const args = { revisionId: 'abc-123', tableId: 'my-table' };
      expect(coerceStringifiedArgs(args)).toEqual(args);
    });

    it('should not touch string that looks like a number', () => {
      const args = { revisionId: '12345' };
      expect(coerceStringifiedArgs(args)).toEqual({ revisionId: '12345' });
    });

    it('should not parse stringified number', () => {
      const args = { data: '42' };
      expect(coerceStringifiedArgs(args)).toEqual({ data: '42' });
    });

    it('should not parse stringified boolean', () => {
      const args = { data: 'true' };
      expect(coerceStringifiedArgs(args)).toEqual({ data: 'true' });
    });

    it('should not parse stringified null', () => {
      const args = { data: 'null' };
      expect(coerceStringifiedArgs(args)).toEqual({ data: 'null' });
    });

    it('should not parse stringified string', () => {
      const args = { data: '"hello"' };
      expect(coerceStringifiedArgs(args)).toEqual({ data: '"hello"' });
    });

    it('should not touch invalid JSON string', () => {
      const args = { data: '{invalid json}' };
      expect(coerceStringifiedArgs(args)).toEqual({ data: '{invalid json}' });
    });
  });

  describe('mixed correct and stringified values', () => {
    it('should only coerce stringified values, leave others intact', () => {
      const args = {
        revisionId: 'abc',
        tableId: 'posts',
        first: 50,
        data: '{"title":"test"}',
        includeRowData: true,
      };
      expect(coerceStringifiedArgs(args)).toEqual({
        revisionId: 'abc',
        tableId: 'posts',
        first: 50,
        data: { title: 'test' },
        includeRowData: true,
      });
    });
  });
});

describe('coerceJsonRpcBody', () => {
  it('should coerce tools/call arguments in a single message', () => {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_row',
        arguments: {
          revisionId: 'abc',
          data: '{"title":"test"}',
        },
      },
    };
    const result = coerceJsonRpcBody(body) as typeof body;
    expect(result.params.arguments).toEqual({
      revisionId: 'abc',
      data: { title: 'test' },
    });
  });

  it('should coerce tools/call arguments in a batch array', () => {
    const body = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'patch_row',
          arguments: {
            revisionId: 'abc',
            patches: '[{"op":"replace","path":"title","value":"x"}]',
          },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      },
    ];
    const result = coerceJsonRpcBody(body) as typeof body;
    expect(result[0].params.arguments).toEqual({
      revisionId: 'abc',
      patches: [{ op: 'replace', path: 'title', value: 'x' }],
    });
    expect(result[1]).toEqual(body[1]);
  });

  it('should not touch non-tools/call messages', () => {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };
    expect(coerceJsonRpcBody(body)).toEqual(body);
  });

  it('should not touch messages without params', () => {
    const body = { jsonrpc: '2.0', id: 1, method: 'initialize' };
    expect(coerceJsonRpcBody(body)).toEqual(body);
  });

  it('should not touch tools/call without arguments', () => {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'some_tool' },
    };
    expect(coerceJsonRpcBody(body)).toEqual(body);
  });

  it('should handle null/undefined body', () => {
    expect(coerceJsonRpcBody(null)).toBeNull();
    expect(coerceJsonRpcBody(undefined)).toBeUndefined();
  });
});
