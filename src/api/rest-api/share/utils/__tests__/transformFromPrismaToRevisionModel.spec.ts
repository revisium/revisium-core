import { Revision } from 'src/__generated__/client';
import {
  transformFromPaginatedPrismaToRevisionModel,
  transformFromPrismaToRevisionModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToRevisionModel';

const makeRevision = (overrides: Partial<Revision> = {}): Revision =>
  ({
    id: 'rev-1',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    isDraft: false,
    isHead: true,
    ...overrides,
  }) as Revision;

describe('transformFromPrismaToRevisionModel', () => {
  it('returns null when given null', () => {
    expect(transformFromPrismaToRevisionModel(null)).toBeNull();
  });

  it('maps the prisma row onto the model with only the expected fields', () => {
    const row = makeRevision({
      id: 'rev-2',
      isDraft: true,
      isHead: false,
    });

    const model = transformFromPrismaToRevisionModel(row);

    expect(model).toEqual({
      id: 'rev-2',
      createdAt: row.createdAt,
      isDraft: true,
      isHead: false,
    });
  });
});

describe('transformFromPaginatedPrismaToRevisionModel', () => {
  it('preserves pageInfo/totalCount and maps every edge node', () => {
    const a = makeRevision({ id: 'a' });
    const b = makeRevision({ id: 'b', isDraft: true, isHead: false });

    const paginated = transformFromPaginatedPrismaToRevisionModel({
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'a',
        endCursor: 'b',
      },
      totalCount: 2,
      edges: [
        { cursor: 'a', node: a },
        { cursor: 'b', node: b },
      ],
    });

    expect(paginated.pageInfo.hasNextPage).toBe(true);
    expect(paginated.totalCount).toBe(2);
    expect(paginated.edges.map((e) => e.cursor)).toEqual(['a', 'b']);
    expect(paginated.edges[0].node).toEqual({
      id: 'a',
      createdAt: a.createdAt,
      isDraft: false,
      isHead: true,
    });
    expect(paginated.edges[1].node).toEqual({
      id: 'b',
      createdAt: b.createdAt,
      isDraft: true,
      isHead: false,
    });
  });
});
