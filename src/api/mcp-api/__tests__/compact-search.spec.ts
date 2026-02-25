import { compactMatch, toCompactSearchResult } from '../tools/row.tools';

describe('compactMatch', () => {
  it('should return path and highlight when highlight is present', () => {
    const result = compactMatch({
      path: 'name',
      value: 'John',
      highlight: '<mark>John</mark>',
    });
    expect(result).toEqual({ path: 'name', highlight: '<mark>John</mark>' });
  });

  it('should return path and value when highlight is undefined', () => {
    const result = compactMatch({ path: 'ver', value: 42 });
    expect(result).toEqual({ path: 'ver', value: 42 });
  });

  it('should return path and value when highlight is null', () => {
    const result = compactMatch({
      path: 'ver',
      value: 100,
      highlight: null as unknown as undefined,
    });
    expect(result).toEqual({ path: 'ver', value: 100 });
  });
});

describe('toCompactSearchResult', () => {
  it('should compact rows without formulaErrors', () => {
    const result = toCompactSearchResult({
      edges: [
        {
          cursor: 'c1',
          node: {
            row: { id: 'row-1', data: { name: 'test' } } as any,
            table: { id: 'table-1', versionId: 'v1' } as any,
            matches: [
              { path: 'name', value: 'test', highlight: '<mark>test</mark>' },
            ],
          },
        },
      ],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: undefined,
      },
      totalCount: 1,
    });

    expect(result.edges[0].node.row).toEqual({ id: 'row-1' });
    expect(result.edges[0].node.table).toEqual({ id: 'table-1' });
    expect(result.edges[0].node.matches).toEqual([
      { path: 'name', highlight: '<mark>test</mark>' },
    ]);
    expect((result.edges[0].node as any).formulaErrors).toBeUndefined();
  });

  it('should include formulaErrors when present', () => {
    const result = toCompactSearchResult({
      edges: [
        {
          cursor: 'c1',
          node: {
            row: { id: 'row-1', data: {} } as any,
            table: { id: 'table-1', versionId: 'v1' } as any,
            matches: [{ path: 'ver', value: 42 }],
            formulaErrors: [
              {
                field: 'total',
                expression: 'price * qty',
                error: 'Division by zero',
                defaultUsed: false,
              },
            ],
          },
        },
      ],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: undefined,
      },
      totalCount: 1,
    });

    expect(result.edges[0].node.formulaErrors).toEqual([
      {
        field: 'total',
        expression: 'price * qty',
        error: 'Division by zero',
        defaultUsed: false,
      },
    ]);
    expect(result.edges[0].node.matches).toEqual([{ path: 'ver', value: 42 }]);
  });

  it('should not include formulaErrors when empty array', () => {
    const result = toCompactSearchResult({
      edges: [
        {
          cursor: 'c1',
          node: {
            row: { id: 'row-1', data: {} } as any,
            table: { id: 'table-1', versionId: 'v1' } as any,
            matches: [],
            formulaErrors: [],
          },
        },
      ],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: undefined,
      },
      totalCount: 1,
    });

    expect((result.edges[0].node as any).formulaErrors).toBeUndefined();
  });
});
