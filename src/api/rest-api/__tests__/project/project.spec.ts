import { INestApplication } from '@nestjs/common';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UserProjectRoles } from 'src/features/auth/consts';
import { nanoid } from 'nanoid';
import request from 'supertest';

describe('restapi - project', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const makeProjectPublic = async (projectId: string) => {
    await prismaService.project.update({
      where: { id: projectId },
      data: { isPublic: true },
    });
  };

  describe('Read Operations', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    describe('GET /organization/:organizationId/projects/:projectName', () => {
      it('owner can get project', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.projectId);
      });

      it('another owner cannot get project (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get project without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .expect(403);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/root-branch', () => {
      it('owner can attempt to get root branch', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/root-branch`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.branchId);
      });

      it('another owner cannot get root branch (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/root-branch`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get root branch without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/root-branch`,
          )
          .expect(403);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches', () => {
      it('owner can get branches', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result.totalCount).toBe(1);
      });

      it('another owner cannot get branches (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get branches without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches`,
          )
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/users', () => {
      it('owner can attempt to get project users', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result.totalCount).toBe(0);
      });

      it('another owner cannot get project users (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get project users without authentication', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
          )
          .query({ first: 10 })
          .expect(401);
      });
    });
  });

  describe('Write Operations - Error Cases', () => {
    let preparedData: PrepareDataReturnType;
    let targetUserId: string;

    beforeAll(async () => {
      preparedData = await prepareData(app);

      const targetUser = await prismaService.user.create({
        data: {
          id: nanoid(),
          email: `test-user-error-cases-${Date.now()}@example.com`,
          username: `testusererror${Date.now()}`,
          password: 'hashedpassword',
          isEmailConfirmed: true,
          roleId: 'systemUser',
        },
      });
      targetUserId = targetUser.id;

      await prismaService.userProject.create({
        data: {
          id: nanoid(),
          userId: targetUserId,
          projectId: preparedData.project.projectId,
          roleId: UserProjectRoles.reader,
        },
      });
    });

    describe('DELETE /organization/:organizationId/projects/:projectName', () => {
      it('another owner cannot delete project (private project)', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot delete project without authentication', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .expect(401);
      });
    });

    describe('PUT /organization/:organizationId/projects/:projectName', () => {
      it('another owner cannot update project (private project)', async () => {
        return request(app.getHttpServer())
          .put(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .send({
            isPublic: true,
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot update project without authentication', async () => {
        return request(app.getHttpServer())
          .put(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .expect(401);
      });
    });

    describe('POST /organization/:organizationId/projects/:projectName/users', () => {
      it('another owner cannot add user to project (private project)', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            userId: targetUserId,
            roleId: UserProjectRoles.reader,
          })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot add user to project without authentication', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
          )
          .send({
            userId: targetUserId,
            roleId: UserProjectRoles.reader,
          })
          .expect(401);
      });
    });

    describe('DELETE /organization/:organizationId/projects/:projectName/users/:userId', () => {
      it('another owner cannot remove user from project (private project)', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users/${targetUserId}`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot remove user from project without authentication', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users/${targetUserId}`,
          )
          .expect(401);
      });
    });
  });

  describe('Write Operations - Success Cases', () => {
    describe('DELETE /organization/:organizationId/projects/:projectName', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can delete project', async () => {
        const result = await request(app.getHttpServer())
          .delete(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result).toStrictEqual({ success: true });
      });
    });

    describe('PUT /organization/:organizationId/projects/:projectName', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can update project', async () => {
        const result = await request(app.getHttpServer())
          .put(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            isPublic: true,
          })
          .expect(200)
          .then((res) => res.body);

        expect(result).toStrictEqual({ success: true });
      });
    });

    describe('POST /organization/:organizationId/projects/:projectName/users', () => {
      let preparedData: PrepareDataReturnType;
      let targetUserId: string;

      beforeEach(async () => {
        preparedData = await prepareData(app);

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

      it('owner can add user to project', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            userId: targetUserId,
            roleId: UserProjectRoles.reader,
          })
          .expect(201)
          .then((res) => res.body);

        expect(result).toStrictEqual({ success: true });

        const userProject = await prismaService.userProject.findFirst({
          where: {
            userId: targetUserId,
            projectId: preparedData.project.projectId,
          },
        });
        expect(userProject).toBeTruthy();
        expect(userProject?.roleId).toBe(UserProjectRoles.reader);
      });
    });

    describe('DELETE /organization/:organizationId/projects/:projectName/users/:userId', () => {
      let preparedData: PrepareDataReturnType;
      let targetUserId: string;

      beforeEach(async () => {
        preparedData = await prepareData(app);

        const id = nanoid();

        const targetUser = await prismaService.user.create({
          data: {
            id,
            email: `test-user-${id}@example.com`,
            username: `testuser${id}`,
            password: 'hashedpassword',
            isEmailConfirmed: true,
            roleId: 'systemUser',
          },
        });
        targetUserId = targetUser.id;

        await prismaService.userProject.create({
          data: {
            id: nanoid(),
            userId: targetUserId,
            projectId: preparedData.project.projectId,
            roleId: UserProjectRoles.reader,
          },
        });
      });

      it('owner can remove user from project', async () => {
        const result = await request(app.getHttpServer())
          .delete(
            `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users/${targetUserId}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result).toStrictEqual({ success: true });

        const userProject = await prismaService.userProject.findFirst({
          where: {
            userId: targetUserId,
            projectId: preparedData.project.projectId,
          },
        });
        expect(userProject).toBeNull();
      });
    });
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner can get project (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe(preparedData.project.projectId);
    });

    it('can get project without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
        )
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe(preparedData.project.projectId);
    });

    it('can attempt to get root branch without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/root-branch`,
        )
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
    });

    it('another owner cannot delete project (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to delete on Project/);
    });

    it('another owner cannot update project (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .put(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          isPublic: false,
        })
        .expect(/You are not allowed to update on Project/);
    });

    it('another owner cannot add user to project (no add user permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          userId: 'test-user',
          roleId: UserProjectRoles.reader,
        })
        .expect(403)
        .expect(/You are not allowed to add on User/);
    });
  });

  describe('Authorization Boundaries', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    it('should reject requests to non-existent organization', async () => {
      return request(app.getHttpServer())
        .get('/api/organization/non-existent/projects/test')
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should reject requests to non-existent project', async () => {
      return request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/non-existent`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should require authentication for protected endpoints', async () => {
      const baseUrl = `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}`;

      await request(app.getHttpServer()).delete(baseUrl).expect(401);

      await request(app.getHttpServer())
        .put(baseUrl)
        .send({ isPublic: true })
        .expect(401);

      await request(app.getHttpServer())
        .get(`${baseUrl}/users`)
        .query({ first: 10 })
        .expect(401);

      await request(app.getHttpServer())
        .post(`${baseUrl}/users`)
        .send({ userId: 'test', roleId: UserProjectRoles.reader })
        .expect(401);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/users/test-user`)
        .expect(401);
    });
  });

  describe('User Management Workflow', () => {
    let preparedData: PrepareDataReturnType;
    let targetUserId: string;

    beforeEach(async () => {
      preparedData = await prepareData(app);

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
      const baseUrl = `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`;

      const addResult = await request(app.getHttpServer())
        .post(baseUrl)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: targetUserId,
          roleId: UserProjectRoles.reader,
        })
        .expect(201)
        .then((res) => res.body);

      expect(addResult).toStrictEqual({ success: true });

      const userProject = await prismaService.userProject.findFirst({
        where: {
          userId: targetUserId,
          projectId: preparedData.project.projectId,
        },
      });
      expect(userProject).toBeTruthy();

      const removeResult = await request(app.getHttpServer())
        .delete(`${baseUrl}/${targetUserId}`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(removeResult).toStrictEqual({ success: true });

      const removedUserProject = await prismaService.userProject.findFirst({
        where: {
          userId: targetUserId,
          projectId: preparedData.project.projectId,
        },
      });
      expect(removedUserProject).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    it('should handle invalid user role when adding user', async () => {
      const targetUser = await prismaService.user.create({
        data: {
          id: nanoid(),
          email: `invalid-role-user-${Date.now()}@example.com`,
          username: `invalidroleuser${Date.now()}`,
          password: 'hashedpassword',
          isEmailConfirmed: true,
          roleId: 'systemUser',
        },
      });

      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: targetUser.id,
          roleId: 'invalidRole',
        })
        .expect(400)
        .expect(/Invalid ProjectRole/);
    });

    it('should handle non-existent user when adding to project', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          userId: 'non-existent-user',
          roleId: UserProjectRoles.reader,
        })
        .expect(400)
        .expect(/User does not exist/);
    });

    it('should handle removing non-existent user from project', async () => {
      return request(app.getHttpServer())
        .delete(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/users/non-existent-user`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(400)
        .expect(/Not found user in project/);
    });
  });
});
