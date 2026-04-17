import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  getTestApp,
  getReadonlyFixture,
  gqlKit,
  type GqlKit,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

const UNAUTHORIZED = /Unauthorized/;

const meQuery = gql`
  query me {
    me {
      id
      username
      email
    }
  }
`;

const meProjectsQuery = gql`
  query meProjects($data: GetMeProjectsInput!) {
    meProjects(data: $data) {
      totalCount
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const searchUsersQuery = gql`
  query searchUsers($data: SearchUsersInput!) {
    searchUsers(data: $data) {
      totalCount
      edges {
        node {
          id
          username
        }
      }
    }
  }
`;

describe('graphql - user (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
    fixture = await getReadonlyFixture(app);
  });

  describe('me query', () => {
    it('owner gets own info', async () => {
      const result = await kit.owner(fixture).expectOk<{
        me: { id: string; username: string };
      }>(meQuery);

      expect(result.me.id).toBe(fixture.owner.user.id);
      expect(result.me.username).toBe(fixture.owner.user.username);
    });

    it('anon is unauthorized', async () => {
      await kit.anon().expectError(meQuery, undefined, UNAUTHORIZED);
    });
  });

  describe('@ResolveField on me', () => {
    it('resolves organizationId', async () => {
      const query = gql`
        query me {
          me {
            id
            organizationId
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        me: { organizationId: string };
      }>(query);
      expect(result.me).toHaveProperty('organizationId');
    });

    it('resolves role', async () => {
      const query = gql`
        query me {
          me {
            id
            role {
              id
              name
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        me: { role: { id: string; name: string } };
      }>(query);
      expect(result.me).toHaveProperty('role');
    });
  });

  describe('meProjects query', () => {
    const vars = { data: { first: 10 } };

    it('owner lists own projects', async () => {
      const result = await kit.owner(fixture).expectOk<{
        meProjects: { totalCount: number };
      }>(meProjectsQuery, vars);
      expect(result.meProjects.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('anon is unauthorized', async () => {
      await kit.anon().expectError(meProjectsQuery, vars, UNAUTHORIZED);
    });
  });

  describe('searchUsers query', () => {
    const vars = { data: { search: 'user', first: 10 } };

    it('owner can search users', async () => {
      const result = await kit.owner(fixture).expectOk<{
        searchUsers: { totalCount: number; edges: unknown[] };
      }>(searchUsersQuery, vars);
      expect(result.searchUsers).toHaveProperty('totalCount');
      expect(result.searchUsers).toHaveProperty('edges');
    });

    it('anon is unauthorized', async () => {
      await kit.anon().expectError(searchUsersQuery, vars, UNAUTHORIZED);
    });
  });
});
