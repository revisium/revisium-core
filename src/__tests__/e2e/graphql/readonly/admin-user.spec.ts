import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { gql } from 'src/__tests__/utils/gql';
import { UserSystemRoles } from 'src/features/auth/consts';
import { AuthService } from 'src/features/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  gqlQuery,
  gqlQueryRaw,
  type PrepareDataReturnType,
} from 'src/__tests__/e2e/shared';

describe('graphql - admin user (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
    prismaService = app.get(PrismaService);
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const createAdminUser = async () => {
    const userId = nanoid();
    const user = await testCreateUser(prismaService, {
      id: userId,
      email: `admin-test-${userId}@example.com`,
      username: `admin-test-${userId}`,
      roleId: UserSystemRoles.systemAdmin,
    });
    const token = authService.login({
      username: user.username ?? '',
      sub: user.id,
    });
    return { user, token };
  };

  describe('adminUsers query', () => {
    const getQuery = (search?: string) => ({
      query: gql`
        query adminUsers($data: SearchUsersInput!) {
          adminUsers(data: $data) {
            totalCount
            edges {
              node {
                id
                username
                email
                roleId
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      variables: {
        data: { search, first: 10 },
      },
    });

    it('admin user can list all users', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(),
      });

      expect(result.adminUsers).toHaveProperty('totalCount');
      expect(result.adminUsers).toHaveProperty('edges');
      expect(result.adminUsers.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('admin user can search users', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(admin.user.username ?? undefined),
      });

      expect(result.adminUsers.totalCount).toBeGreaterThanOrEqual(1);
      const foundUser = result.adminUsers.edges.find(
        (edge: { node: { id: string } }) => edge.node.id === admin.user.id,
      );
      expect(foundUser).toBeDefined();
    });

    it('includes roleId field in response', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(admin.user.username ?? undefined),
      });

      const foundUser = result.adminUsers.edges.find(
        (edge: { node: { id: string } }) => edge.node.id === admin.user.id,
      );
      expect(foundUser?.node.roleId).toBe(UserSystemRoles.systemAdmin);
    });

    it('regular user cannot access adminUsers', async () => {
      const result = await gqlQueryRaw({
        app,
        token: fixture.owner.token,
        ...getQuery(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/not allowed/i);
    });

    it('unauthenticated cannot access adminUsers', async () => {
      const result = await gqlQueryRaw({
        app,
        ...getQuery(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/Unauthorized/i);
    });
  });

  describe('adminUser query', () => {
    const getQuery = (userId: string) => ({
      query: gql`
        query adminUser($data: AdminUserInput!) {
          adminUser(data: $data) {
            id
            username
            email
            roleId
          }
        }
      `,
      variables: {
        data: { userId },
      },
    });

    it('admin user can get user by id', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(admin.user.id),
      });

      expect(result.adminUser).toBeDefined();
      expect(result.adminUser.id).toBe(admin.user.id);
      expect(result.adminUser.username).toBe(admin.user.username);
    });

    it('includes roleId field in response', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(admin.user.id),
      });

      expect(result.adminUser.roleId).toBe(UserSystemRoles.systemAdmin);
    });

    it('throws error for non-existent user', async () => {
      const admin = await createAdminUser();
      const nonExistentUserId = nanoid();

      const result = await gqlQueryRaw({
        app,
        token: admin.token,
        ...getQuery(nonExistentUserId),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/Not found user/i);
    });

    it('regular user cannot access adminUser', async () => {
      const result = await gqlQueryRaw({
        app,
        token: fixture.owner.token,
        ...getQuery(fixture.owner.user.id),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/not allowed/i);
    });

    it('unauthenticated cannot access adminUser', async () => {
      const result = await gqlQueryRaw({
        app,
        ...getQuery(fixture.owner.user.id),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/Unauthorized/i);
    });
  });

  describe('role field resolution via adminUser', () => {
    const getQueryWithRole = (userId: string) => ({
      query: gql`
        query adminUser($data: AdminUserInput!) {
          adminUser(data: $data) {
            id
            roleId
            role {
              id
              name
            }
          }
        }
      `,
      variables: {
        data: { userId },
      },
    });

    it('resolves role field for admin user', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQueryWithRole(admin.user.id),
      });

      expect(result.adminUser.role).toBeDefined();
      expect(result.adminUser.role.id).toBe(UserSystemRoles.systemAdmin);
    });
  });
});
