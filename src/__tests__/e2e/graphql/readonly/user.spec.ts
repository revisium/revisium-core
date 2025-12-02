import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  gqlQuery,
  gqlQueryExpectError,
  type PrepareDataReturnType,
} from 'src/__tests__/e2e/shared';

describe('graphql - user (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('me query', () => {
    const getQuery = () => ({
      query: gql`
        query me {
          me {
            id
            username
            email
          }
        }
      `,
    });

    it('authenticated user can get own info', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(),
      });

      expect(result.me.id).toBe(fixture.owner.user.id);
      expect(result.me.username).toBe(fixture.owner.user.username);
    });

    it('unauthenticated cannot get me', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(),
        },
        /Unauthorized/,
      );
    });
  });

  describe('me with @ResolveField', () => {
    describe('organizationId field', () => {
      const getQuery = () => ({
        query: gql`
          query me {
            me {
              id
              organizationId
            }
          }
        `,
      });

      it('resolves organizationId field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(),
        });

        expect(result.me).toHaveProperty('organizationId');
      });
    });

    describe('role field', () => {
      const getQuery = () => ({
        query: gql`
          query me {
            me {
              id
              role {
                id
                name
              }
            }
          }
        `,
      });

      it('resolves role field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(),
        });

        expect(result.me).toHaveProperty('role');
      });
    });
  });

  describe('meProjects query', () => {
    const getQuery = () => ({
      query: gql`
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
      `,
      variables: {
        data: { first: 10 },
      },
    });

    it('authenticated user can get own projects', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(),
      });

      expect(result.meProjects.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('unauthenticated cannot get meProjects', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(),
        },
        /Unauthorized/,
      );
    });
  });

  describe('searchUsers query', () => {
    const getQuery = (search: string) => ({
      query: gql`
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
      `,
      variables: {
        data: { search, first: 10 },
      },
    });

    it('authenticated user can search users', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery('user'),
      });

      expect(result.searchUsers).toHaveProperty('totalCount');
      expect(result.searchUsers).toHaveProperty('edges');
    });

    it('unauthenticated cannot search users', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery('user'),
        },
        /Unauthorized/,
      );
    });
  });
});
