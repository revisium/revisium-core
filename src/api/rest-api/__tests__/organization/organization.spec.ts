import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { nanoid } from 'nanoid';
import request from 'supertest';

describe('restapi - organization', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get(PrismaService);
    await app.init();
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
      const result = await request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          projectName,
          branchName: 'main',
        })
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(projectName);
      expect(result.organizationId).toBe(preparedData.project.organizationId);
    });

    it('another organization owner cannot create project', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          projectName: 'test-project',
          branchName: 'main',
        })
        .expect(/You are not allowed to create on Project/);
    });

    it('cannot create project without authentication', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects`,
        )
        .send({
          projectName: 'test-project',
          branchName: 'main',
        })
        .expect(401);
    });

    it('can create project with fromRevisionId parameter', async () => {
      const projectName = `test-project-from-revision-${Date.now()}`;
      const result = await request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ fromRevisionId: preparedData.project.headRevisionId })
        .send({
          projectName,
          branchName: 'main',
        })
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(projectName);
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
      const result = await request(app.getHttpServer())
        .post(`/api/organization/${preparedData.project.organizationId}/users`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: targetUserId,
          roleId: UserOrganizationRoles.reader,
        })
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
      return request(app.getHttpServer())
        .post(`/api/organization/${preparedData.project.organizationId}/users`)
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          userId: targetUserId,
          roleId: UserOrganizationRoles.reader,
        })
        .expect(/You are not allowed to add on User/);
    });

    it('cannot add user without authentication', async () => {
      return request(app.getHttpServer())
        .post(`/api/organization/${preparedData.project.organizationId}/users`)
        .send({
          userId: targetUserId,
          roleId: UserOrganizationRoles.reader,
        })
        .expect(401);
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
      const result = await request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/users`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: targetUserId,
        })
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
      return request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/users`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          userId: targetUserId,
        })
        .expect(/You are not allowed to delete on User/);
    });

    it('cannot remove user without authentication', async () => {
      return request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/users`,
        )
        .send({
          userId: targetUserId,
        })
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
      const addResult = await request(app.getHttpServer())
        .post(`/api/organization/${preparedData.project.organizationId}/users`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: targetUserId,
          roleId: UserOrganizationRoles.reader,
        })
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
      const removeResult = await request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/users`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: targetUserId,
        })
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
      return request(app.getHttpServer())
        .post('/api/organization/non-existent/projects')
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          projectName: 'test-project',
          branchName: 'main',
        })
        .expect(403);
    });

    it('should require authentication for protected endpoints', async () => {
      // Test project creation endpoint
      await request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects`,
        )
        .send({ projectName: 'test', branchName: 'main' })
        .expect(401);

      // Test add user endpoint
      await request(app.getHttpServer())
        .post(`/api/organization/${preparedData.project.organizationId}/users`)
        .send({ userId: 'test-user', roleId: UserOrganizationRoles.reader })
        .expect(401);

      // Test remove user endpoint
      await request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/users`,
        )
        .send({ userId: 'test-user' })
        .expect(401);
    });
  });
});
