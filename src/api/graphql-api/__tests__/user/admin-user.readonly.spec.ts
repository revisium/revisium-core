import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/testing/factories/create-models';
import { gql } from 'src/testing/utils/gql';
import { UserSystemRoles } from 'src/features/auth/consts';
import { AuthService } from 'src/features/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  getTestApp,
  getReadonlyFixture,
  gqlKit,
  type GqlKit,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

const NOT_ALLOWED = /not allowed/i;
const UNAUTHORIZED = /Unauthorized/i;

const adminUsersQuery = gql`
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
`;

const adminUserQuery = gql`
  query adminUser($data: AdminUserInput!) {
    adminUser(data: $data) {
      id
      username
      email
      roleId
    }
  }
`;

const adminUserWithRoleQuery = gql`
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
`;

describe('graphql - admin user (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;
  let fixture: PrepareDataReturnType;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
    fixture = await getReadonlyFixture(app);
    prismaService = app.get(PrismaService);
    authService = app.get(AuthService);
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
    const listVars = (search?: string) => ({
      data: { search, first: 10 },
    });

    it('admin lists all users', async () => {
      const admin = await createAdminUser();
      const result = await kit.actor(admin.token).expectOk<{
        adminUsers: { totalCount: number; edges: unknown[] };
      }>(adminUsersQuery, listVars());

      expect(result.adminUsers.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.adminUsers).toHaveProperty('edges');
    });

    it('admin can search users and sees roleId', async () => {
      const admin = await createAdminUser();
      const result = await kit.actor(admin.token).expectOk<{
        adminUsers: {
          totalCount: number;
          edges: Array<{ node: { id: string; roleId: string } }>;
        };
      }>(adminUsersQuery, listVars(admin.user.username ?? undefined));

      expect(result.adminUsers.totalCount).toBeGreaterThanOrEqual(1);
      const found = result.adminUsers.edges.find(
        (e) => e.node.id === admin.user.id,
      );
      expect(found?.node.roleId).toBe(UserSystemRoles.systemAdmin);
    });

    it('regular user is not allowed', async () => {
      await kit
        .owner(fixture)
        .expectError(adminUsersQuery, listVars(), NOT_ALLOWED);
    });

    it('anon is unauthorized', async () => {
      await kit.anon().expectError(adminUsersQuery, listVars(), UNAUTHORIZED);
    });
  });

  describe('adminUser query', () => {
    const vars = (userId: string) => ({ data: { userId } });

    it('admin gets user by id', async () => {
      const admin = await createAdminUser();
      const result = await kit.actor(admin.token).expectOk<{
        adminUser: { id: string; username: string; roleId: string };
      }>(adminUserQuery, vars(admin.user.id));

      expect(result.adminUser.id).toBe(admin.user.id);
      expect(result.adminUser.username).toBe(admin.user.username);
      expect(result.adminUser.roleId).toBe(UserSystemRoles.systemAdmin);
    });

    it('admin hitting non-existent user gets not-found', async () => {
      const admin = await createAdminUser();
      await kit
        .actor(admin.token)
        .expectError(adminUserQuery, vars(nanoid()), /Not found user/i);
    });

    it('regular user is not allowed', async () => {
      await kit
        .owner(fixture)
        .expectError(adminUserQuery, vars(fixture.owner.user.id), NOT_ALLOWED);
    });

    it('anon is unauthorized', async () => {
      await kit
        .anon()
        .expectError(adminUserQuery, vars(fixture.owner.user.id), UNAUTHORIZED);
    });
  });

  describe('role field resolution via adminUser', () => {
    it('resolves role field for admin user', async () => {
      const admin = await createAdminUser();
      const result = await kit.actor(admin.token).expectOk<{
        adminUser: { role: { id: string } };
      }>(adminUserWithRoleQuery, { data: { userId: admin.user.id } });

      expect(result.adminUser.role.id).toBe(UserSystemRoles.systemAdmin);
    });
  });
});
