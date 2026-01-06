import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
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
  makeProjectPublic,
} from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('restapi - branch-by-name', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Read Operations', () => {
    let preparedData: PrepareDataReturnType;
    let childBranchName: string;

    beforeAll(async () => {
      preparedData = await prepareData(app);

      const childBranch = await prismaService.branch.create({
        data: {
          id: nanoid(),
          name: nanoid(),
          projectId: preparedData.project.projectId,
          revisions: {
            create: {
              isStart: true,
              id: nanoid(),
              parent: {
                connect: {
                  id: preparedData.project.headRevisionId,
                },
              },
            },
          },
        },
      });

      childBranchName = childBranch.name;
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName', () => {
      it('owner can get branch', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
          preparedData.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.branchId);
      });

      it('another owner cannot get branch (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
          preparedData.anotherOwner.token,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get branch without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/touched', () => {
      it('owner can get branch touched status', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/touched`,
          preparedData.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result.touched).toBe(true);
      });

      it('another owner cannot get touched status (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/touched`,
          preparedData.anotherOwner.token,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get touched status without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/touched`,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/parent-branch', () => {
      it('owner can attempt to get parent branch', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${childBranchName}/parent-branch`,
          preparedData.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result.branch.id).toBe(preparedData.project.branchId);
        expect(result.revision.id).toBe(preparedData.project.headRevisionId);
      });

      it('another owner cannot get parent branch (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${childBranchName}/parent-branch`,
          preparedData.anotherOwner.token,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get parent branch without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${childBranchName}/parent-branch`,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/start-revision', () => {
      it('owner can attempt to get start revision', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/start-revision`,
          preparedData.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.headRevisionId);
      });

      it('another owner cannot get start revision (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/start-revision`,
          preparedData.anotherOwner.token,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get start revision without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/start-revision`,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/head-revision', () => {
      it('owner can get head revision', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/head-revision`,
          preparedData.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.headRevisionId);
      });

      it('another owner cannot get head revision (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/head-revision`,
          preparedData.anotherOwner.token,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get head revision without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/head-revision`,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/draft-revision', () => {
      it('owner can get draft revision', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/draft-revision`,
          preparedData.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.draftRevisionId);
      });

      it('another owner cannot get draft revision (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/draft-revision`,
          preparedData.anotherOwner.token,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get draft revision without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/draft-revision`,
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/revisions', () => {
      it('owner can attempt to get revisions', async () => {
        const result = await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revisions`,
          preparedData.owner.token,
        )
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result.totalCount).toBe(2);
      });

      it('another owner cannot get revisions (private project)', async () => {
        await authGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revisions`,
          preparedData.anotherOwner.token,
        )
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get revisions without authentication (private project)', async () => {
        await anonGet(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revisions`,
        )
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });
  });

  describe('Write Operations - Error Cases', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    describe('POST /organization/:organizationId/projects/:projectName/branches/:branchName/create-revision', () => {
      it('another owner cannot create revision (private project)', async () => {
        await authPost(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/create-revision`,
          preparedData.anotherOwner.token,
          { comment: 'Test revision' },
        )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create revision without authentication', async () => {
        await anonPost(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/create-revision`,
          {
            comment: 'Test revision',
          },
        ).expect(401);
      });
    });

    describe('POST /organization/:organizationId/projects/:projectName/branches/:branchName/revert-changes', () => {
      it('another owner cannot revert changes (private project)', async () => {
        await authPost(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revert-changes`,
          preparedData.anotherOwner.token,
        ).expect(/You are not allowed to read on Project/);
      });

      it('cannot revert changes without authentication', async () => {
        await anonPost(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revert-changes`,
        ).expect(401);
      });
    });
  });

  describe('Write Operations - Success Cases', () => {
    describe('POST /organization/:organizationId/projects/:projectName/branches/:branchName/create-revision', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can create revision', async () => {
        const result = await authPost(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/create-revision`,
          preparedData.owner.token,
          { comment: 'Test revision' },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
      });
    });

    describe('POST /organization/:organizationId/projects/:projectName/branches/:branchName/revert-changes', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can revert changes', async () => {
        const result = await authPost(
          app,
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revert-changes`,
          preparedData.owner.token,
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.branchId);
        expect(result.projectId).toBe(preparedData.project.projectId);
      });
    });
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(app, preparedData.project.projectId);
    });

    it('another owner can get branch (public project)', async () => {
      const result = await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
        preparedData.anotherOwner.token,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
      expect(result.projectId).toBe(preparedData.project.projectId);
    });

    it('can get branch without authentication (public project)', async () => {
      const result = await anonGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
      expect(result.projectId).toBe(preparedData.project.projectId);
    });

    it('can attempt to get revisions without authentication (public project)', async () => {
      const result = await anonGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revisions`,
      )
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(2);
    });

    it('another owner cannot create revision (no write permission on public project)', async () => {
      await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/create-revision`,
        preparedData.anotherOwner.token,
        { comment: 'Test revision' },
      )
        .expect(403)
        .expect(/You are not allowed to create on Revision/);
    });

    it('another owner cannot revert changes (no revert permission on public project)', async () => {
      await authPost(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revert-changes`,
        preparedData.anotherOwner.token,
      )
        .expect(403)
        .expect(/You are not allowed to revert on Revision/);
    });
  });

  describe('Authorization Boundaries', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    it('should reject requests to non-existent organization', async () => {
      await authGet(
        app,
        '/api/organization/non-existent/projects/test/branches/master',
        preparedData.owner.token,
      ).expect(403);
    });

    it('should reject requests to non-existent project', async () => {
      await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/non-existent/branches/master`,
        preparedData.owner.token,
      ).expect(403);
    });

    it('should reject requests to non-existent branch', async () => {
      await authGet(
        app,
        `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/non-existent`,
        preparedData.owner.token,
      ).expect(400);
    });

    it('should require authentication for protected endpoints', async () => {
      const baseUrl = `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`;

      await anonPost(app, `${baseUrl}/create-revision`, {
        comment: 'Test',
      }).expect(401);

      await anonPost(app, `${baseUrl}/revert-changes`).expect(401);
    });
  });
});
