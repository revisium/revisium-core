import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import request from 'supertest';

describe('restapi - branch-by-name', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get(PrismaService);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );
    await app.init();
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

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get branch', async () => {
      const result = await request(app.getHttpServer())
        .get(getBranchUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
    });

    it('another owner cannot get branch (private project)', async () => {
      return request(app.getHttpServer())
        .get(getBranchUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get branch without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getBranchUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getBranchUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`;
    }
  });

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/touched', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get branch touched status', async () => {
      const result = await request(app.getHttpServer())
        .get(getTouchedUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.touched).toBe(true);
    });

    it('another owner cannot get touched status (private project)', async () => {
      return request(app.getHttpServer())
        .get(getTouchedUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get touched status without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getTouchedUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getTouchedUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/touched`;
    }
  });

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/parent-branch', () => {
    let preparedData: PrepareDataReturnType;
    let childBranchName: string;

    beforeEach(async () => {
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

    it('owner can attempt to get parent branch', async () => {
      const result = await request(app.getHttpServer())
        .get(getParentBranchUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.branch.id).toBe(preparedData.project.branchId);
      expect(result.revision.id).toBe(preparedData.project.headRevisionId);
    });

    it('another owner cannot get parent branch (private project)', async () => {
      return request(app.getHttpServer())
        .get(getParentBranchUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get parent branch without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getParentBranchUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getParentBranchUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${childBranchName}/parent-branch`;
    }
  });

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/start-revision', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can attempt to get start revision', async () => {
      const result = await request(app.getHttpServer())
        .get(getStartRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.headRevisionId);
    });

    it('another owner cannot get start revision (private project)', async () => {
      return request(app.getHttpServer())
        .get(getStartRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get start revision without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getStartRevisionUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getStartRevisionUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/start-revision`;
    }
  });

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/head-revision', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get head revision', async () => {
      const result = await request(app.getHttpServer())
        .get(getHeadRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.headRevisionId);
    });

    it('another owner cannot get head revision (private project)', async () => {
      return request(app.getHttpServer())
        .get(getHeadRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get head revision without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getHeadRevisionUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getHeadRevisionUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/head-revision`;
    }
  });

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/draft-revision', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get draft revision', async () => {
      const result = await request(app.getHttpServer())
        .get(getDraftRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.draftRevisionId);
    });

    it('another owner cannot get draft revision (private project)', async () => {
      return request(app.getHttpServer())
        .get(getDraftRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get draft revision without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getDraftRevisionUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getDraftRevisionUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/draft-revision`;
    }
  });

  describe('GET /organization/:organizationId/projects/:projectName/branches/:branchName/revisions', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can attempt to get revisions', async () => {
      const result = await request(app.getHttpServer())
        .get(getRevisionsUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(2);
    });

    it('another owner cannot get revisions (private project)', async () => {
      return request(app.getHttpServer())
        .get(getRevisionsUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get revisions without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getRevisionsUrl())
        .query({ first: 10 })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    function getRevisionsUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revisions`;
    }
  });

  describe('POST /organization/:organizationId/projects/:projectName/branches/:branchName/create-revision', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can create revision', async () => {
      const result = await request(app.getHttpServer())
        .post(getCreateRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          comment: 'Test revision',
        })
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
    });

    it('another owner cannot create revision (private project)', async () => {
      return request(app.getHttpServer())
        .post(getCreateRevisionUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          comment: 'Test revision',
        })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot create revision without authentication', async () => {
      return request(app.getHttpServer())
        .post(getCreateRevisionUrl())
        .send({
          comment: 'Test revision',
        })
        .expect(401);
    });

    function getCreateRevisionUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/create-revision`;
    }
  });

  describe('POST /organization/:organizationId/projects/:projectName/branches/:branchName/revert-changes', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can revert changes', async () => {
      const result = await request(app.getHttpServer())
        .post(getRevertChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(201)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
      expect(result.projectId).toBe(preparedData.project.projectId);
    });

    it('another owner cannot revert changes (private project)', async () => {
      return request(app.getHttpServer())
        .post(getRevertChangesUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot revert changes without authentication', async () => {
      return request(app.getHttpServer())
        .post(getRevertChangesUrl())
        .expect(401);
    });

    function getRevertChangesUrl() {
      return `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revert-changes`;
    }
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner can get branch (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
      expect(result.projectId).toBe(preparedData.project.projectId);
    });

    it('can get branch without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`,
        )
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.branchId);
      expect(result.projectId).toBe(preparedData.project.projectId);
    });

    it('can attempt to get revisions without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revisions`,
        )
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(2);
    });

    it('another owner cannot create revision (no write permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/create-revision`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          comment: 'Test revision',
        })
        .expect(403)
        .expect(/You are not allowed to create on Revision/);
    });

    it('another owner cannot revert changes (no revert permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}/revert-changes`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to revert on Revision/);
    });
  });

  describe('Authorization Boundaries', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should reject requests to non-existent organization', async () => {
      return request(app.getHttpServer())
        .get('/api/organization/non-existent/projects/test/branches/main')
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should reject requests to non-existent project', async () => {
      return request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/non-existent/branches/main`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should reject requests to non-existent branch', async () => {
      return request(app.getHttpServer())
        .get(
          `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/non-existent`,
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(400);
    });

    it('should require authentication for protected endpoints', async () => {
      const baseUrl = `/api/organization/${preparedData.project.organizationId}/projects/${preparedData.project.projectName}/branches/${preparedData.project.branchName}`;

      // Test create revision endpoint
      await request(app.getHttpServer())
        .post(`${baseUrl}/create-revision`)
        .send({ comment: 'Test' })
        .expect(401);

      // Test revert changes endpoint
      await request(app.getHttpServer())
        .post(`${baseUrl}/revert-changes`)
        .expect(401);
    });
  });
});
