import { GetUsersOrganizationQueryReturnType } from 'src/features/organization/queries/impl';
import {
  transformFromPaginatedPrismaToUserOrganizationModel,
  transformFromPrismaToUserOrganizationModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToUserOrganizationModel';

type EdgeNode = GetUsersOrganizationQueryReturnType['edges'][number]['node'];

const makeNode = (overrides: Partial<EdgeNode> = {}): EdgeNode =>
  ({
    id: 'membership-1',
    user: { id: 'user-1', username: 'alice', email: 'alice@example.com' },
    role: { id: 'role-1', name: 'admin' },
    ...overrides,
  }) as EdgeNode;

describe('transformFromPrismaToUserOrganizationModel', () => {
  it('maps user and role fields when both username and email are present', () => {
    const node = makeNode();

    expect(transformFromPrismaToUserOrganizationModel(node)).toEqual({
      id: 'membership-1',
      user: { id: 'user-1', username: 'alice', email: 'alice@example.com' },
      role: { id: 'role-1', name: 'admin' },
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

    const model = transformFromPrismaToUserOrganizationModel(node);

    expect(model.user.username).toBeUndefined();
    expect(model.user.email).toBeUndefined();
  });
});

describe('transformFromPaginatedPrismaToUserOrganizationModel', () => {
  it('preserves pagination metadata and applies the row mapper to every edge', () => {
    const node = makeNode({ id: 'm-1' });

    const paginated = transformFromPaginatedPrismaToUserOrganizationModel({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'm-1',
        endCursor: 'm-1',
      },
      totalCount: 1,
      edges: [{ cursor: 'm-1', node }],
    });

    expect(paginated.totalCount).toBe(1);
    expect(paginated.pageInfo.hasPreviousPage).toBe(true);
    expect(paginated.edges[0]).toEqual({
      cursor: 'm-1',
      node: {
        id: 'm-1',
        user: { id: 'user-1', username: 'alice', email: 'alice@example.com' },
        role: { id: 'role-1', name: 'admin' },
      },
    });
  });
});
