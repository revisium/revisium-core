import { GetUsersProjectQueryReturnType } from 'src/features/project/queries/impl';
import {
  transformFromPaginatedPrismaToUserProjectModel,
  transformFromPrismaToUserProjectModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToUserProjectModel';

type EdgeNode = GetUsersProjectQueryReturnType['edges'][number]['node'];

const makeNode = (overrides: Partial<EdgeNode> = {}): EdgeNode =>
  ({
    id: 'project-membership-1',
    user: { id: 'user-1', username: 'bob', email: 'bob@example.com' },
    role: { id: 'role-1', name: 'editor' },
    ...overrides,
  }) as EdgeNode;

describe('transformFromPrismaToUserProjectModel', () => {
  it('maps user and role fields when both username and email are present', () => {
    const node = makeNode();

    expect(transformFromPrismaToUserProjectModel(node)).toEqual({
      id: 'project-membership-1',
      user: { id: 'user-1', username: 'bob', email: 'bob@example.com' },
      role: { id: 'role-1', name: 'editor' },
    });
  });

  it('coerces null username and email to undefined', () => {
    const node = makeNode({
      user: {
        id: 'user-2',
        username: null,
        email: null,
      } as EdgeNode['user'],
    });

    const model = transformFromPrismaToUserProjectModel(node);

    expect(model.user.username).toBeUndefined();
    expect(model.user.email).toBeUndefined();
  });
});

describe('transformFromPaginatedPrismaToUserProjectModel', () => {
  it('preserves pagination metadata and applies the row mapper to every edge', () => {
    const node = makeNode({ id: 'pm-1' });

    const paginated = transformFromPaginatedPrismaToUserProjectModel({
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'pm-1',
        endCursor: 'pm-1',
      },
      totalCount: 1,
      edges: [{ cursor: 'pm-1', node }],
    });

    expect(paginated.totalCount).toBe(1);
    expect(paginated.pageInfo.hasNextPage).toBe(true);
    expect(paginated.edges[0]).toEqual({
      cursor: 'pm-1',
      node: {
        id: 'pm-1',
        user: { id: 'user-1', username: 'bob', email: 'bob@example.com' },
        role: { id: 'role-1', name: 'editor' },
      },
    });
  });
});
