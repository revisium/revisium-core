import { INestApplication } from '@nestjs/common';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  authGet,
  anonGet,
  authPost,
  anonPost,
  authDelete,
  anonDelete,
} from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { nanoid } from 'nanoid';

describe('restapi - organization', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /organization/:organizationId/projects', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('organization owner can create project', async () => {
      const projectName = `test-project-${Date.now()}`;
      const result = await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects`,
        preparedData.owner.token,
        { projectName, branchName: 'master' },
      )
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(projectName);
      expect(result.organizationId).toBe(preparedData.project.organizationId);
    });

    it('another organization owner cannot create project', async () => {
      await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects`,
        preparedData.anotherOwner.token,
        { projectName: 'test-project', branchName: 'master' },
      ).expect(/You are not allowed to create on Project/);
    });

    it('cannot create project without authentication', async () => {
      await anonPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects`,
        { projectName: 'test-project', branchName: 'master' },
      ).expect(401);
    });

    it('can create project with fromRevisionId parameter', async () => {
      const projectName = `test-project-from-revision-${Date.now()}`;
      const result = await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects?fromRevisionId=${preparedData.project.headRevisionId}`,
        preparedData.owner.token,
        { projectName, branchName: 'master' },
      )
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(projectName);
    });
  });

  describe('GET /organization/:organizationId/projects', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('organization owner can get projects', async () => {
      const result = await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects?first=10`,
        preparedData.owner.token,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.edges).toBeDefined();
    });

    it('another organization owner cannot see other organization projects', async () => {
      const result = await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects?first=10`,
        preparedData.anotherOwner.token,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(0);
    });

    it('unauthenticated user gets empty list for private projects', async () => {
      const result = await anonGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects?first=10`,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(0);
    });
  });

  describe('GET /organization/:organizationId/users', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('organization owner can get users of own organization', async () => {
      const result = await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/users?first=10`,
        preparedData.owner.token,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.edges).toBeDefined();
    });

    it('another organization owner cannot get users of other organization', async () => {
      await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/users?first=10`,
        preparedData.anotherOwner.token,
      ).expect(403);
    });

    it('unauthenticated user cannot get users', async () => {
      await anonGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/users?first=10`,
      ).expect(401);
    });
  });

  describe('POST /organization/:organizationId/users', () => {
    let preparedData: PrepareDataReturnType;
    let targetUserId: string;

    beforeEach(async () => {
      preparedData = await prepareData(app);

      // Create a target user to add to the organization
      const targetUser = await prismaService.user.create({
        data: {
          id: nanoid(),
          email: `test-user-${Date.now()}@example.com`,
          username: `testuser${Date.now()}`,
          password: 'hashedpassword',
          isEmailConfirmed: true,
          roleId: 'systemUser',
        },
      });
      targetUserId = targetUser.id;
    });

    it('organization owner can add user to organization', async () => {
      const result = await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        preparedData.owner.token,
        { userId: targetUserId, roleId: UserOrganizationRoles.reader },
      )
        .expect(201)
        .then((res) => res.body);

      expect(result).toBeTruthy();

      // Verify user was added
      const userOrg = await prismaService.userOrganization.findFirst({
        where: {
          userId: targetUserId,
          organizationId: preparedData.project.organizationId,
        },
      });
      expect(userOrg).toBeTruthy();
      expect(userOrg?.roleId).toBe(UserOrganizationRoles.reader);
    });

    it('another organization owner cannot add user', async () => {
      await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        preparedData.anotherOwner.token,
        { userId: targetUserId, roleId: UserOrganizationRoles.reader },
      ).expect(/You are not allowed to add on User/);
    });

    it('cannot add user without authentication', async () => {
      await anonPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        { userId: targetUserId, roleId: UserOrganizationRoles.reader },
      ).expect(401);
    });
  });

  describe('DELETE /organization/:organizationId/users', () => {
    let preparedData: PrepareDataReturnType;
    let targetUserId: string;

    beforeEach(async () => {
      preparedData = await prepareData(app);

      // Create and add a user to the organization
      const targetUser = await prismaService.user.create({
        data: {
          id: nanoid(),
          email: `test-user-${Date.now()}@example.com`,
          username: `testuser${Date.now()}`,
          password: 'hashedpassword',
          isEmailConfirmed: true,
          roleId: 'systemUser',
        },
      });
      targetUserId = targetUser.id;

      await prismaService.userOrganization.create({
        data: {
          id: nanoid(),
          userId: targetUserId,
          organizationId: preparedData.project.organizationId,
          roleId: UserOrganizationRoles.reader,
        },
      });
    });

    it('organization owner can remove user from organization', async () => {
      const result = await authDelete(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        preparedData.owner.token,
      )
        .send({ userId: targetUserId })
        .expect(200)
        .then((res) => res.body);

      expect(result).toBeTruthy();

      // Verify user was removed
      const userOrg = await prismaService.userOrganization.findFirst({
        where: {
          userId: targetUserId,
          organizationId: preparedData.project.organizationId,
        },
      });
      expect(userOrg).toBeNull();
    });

    it('another organization owner cannot remove user', async () => {
      await authDelete(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        preparedData.anotherOwner.token,
      )
        .send({ userId: targetUserId })
        .expect(/You are not allowed to delete on User/);
    });

    it('cannot remove user without authentication', async () => {
      await anonDelete(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
      )
        .send({ userId: targetUserId })
        .expect(401);
    });
  });

  describe('User Management Workflow', () => {
    let preparedData: PrepareDataReturnType;
    let targetUserId: string;

    beforeEach(async () => {
      preparedData = await prepareData(app);

      // Create a user to use in tests
      const targetUser = await prismaService.user.create({
        data: {
          id: nanoid(),
          email: `target-user-${Date.now()}@example.com`,
          username: `targetuser${Date.now()}`,
          password: 'hashedpassword',
          isEmailConfirmed: true,
          roleId: 'systemUser',
        },
      });
      targetUserId = targetUser.id;
    });

    it('should handle complete user lifecycle (add, verify, remove)', async () => {
      // Add user
      const addResult = await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        preparedData.owner.token,
        { userId: targetUserId, roleId: UserOrganizationRoles.reader },
      )
        .expect(201)
        .then((res) => res.body);

      expect(addResult).toBeTruthy();

      // Verify user was added
      const userOrg = await prismaService.userOrganization.findFirst({
        where: {
          userId: targetUserId,
          organizationId: preparedData.project.organizationId,
        },
      });
      expect(userOrg).toBeTruthy();

      // Remove user
      const removeResult = await authDelete(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        preparedData.owner.token,
      )
        .send({ userId: targetUserId })
        .expect(200)
        .then((res) => res.body);

      expect(removeResult).toBeTruthy();

      // Verify user was removed
      const removedUserOrg = await prismaService.userOrganization.findFirst({
        where: {
          userId: targetUserId,
          organizationId: preparedData.project.organizationId,
        },
      });
      expect(removedUserOrg).toBeNull();
    });
  });

  describe('Authorization Boundaries', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should reject requests to non-existent organization', async () => {
      await authPost(
        app,
        '/api/organization/non-existent/projects',
        preparedData.owner.token,
        { projectName: 'test-project', branchName: 'master' },
      ).expect(403);
    });

    it('should require authentication for protected endpoints', async () => {
      // Test project creation endpoint
      await anonPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects`,
        { projectName: 'test', branchName: 'master' },
      ).expect(401);

      // Test add user endpoint
      await anonPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
        { userId: 'test-user', roleId: UserOrganizationRoles.reader },
      ).expect(401);

      // Test remove user endpoint
      await anonDelete(
        app,
        `/api/organization/${preparedData.project.organizationId}/users`,
      )
        .send({ userId: 'test-user' })
        .expect(401);
    });
  });
});
