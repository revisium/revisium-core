import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointType } from 'src/api/graphql-api/endpoint/model/endpoint.model';
import request from 'supertest';

describe('restapi - revision-by-id', () => {
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
    let childRevisionId: string;

    beforeAll(async () => {
      preparedData = await prepareData(app);

      const childRevision = await prismaService.revision.create({
        data: {
          id: nanoid(),
          branchId: preparedData.project.branchId,
          parentId: preparedData.project.headRevisionId,
        },
      });

      childRevisionId = childRevision.id;
    });

    describe('GET /revision/:revisionId', () => {
      it('owner can get revision', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}`)
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.draftRevisionId);
        expect(result.createdAt).toBeDefined();
        expect(result.isDraft).toBeDefined();
        expect(result.isHead).toBeDefined();
      });

      it('another owner cannot get revision (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}`)
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get revision without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /revision/:revisionId/parent-revision', () => {
      it('owner can get parent revision', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${childRevisionId}/parent-revision`)
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.headRevisionId);
      });

      it('another owner cannot get parent revision (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${childRevisionId}/parent-revision`)
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get parent revision without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${childRevisionId}/parent-revision`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /revision/:revisionId/child-revision', () => {
      it('owner can get child revision', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.headRevisionId}/child-revision`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.draftRevisionId);
      });

      it('another owner cannot get child revision (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.headRevisionId}/child-revision`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get child revision without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.headRevisionId}/child-revision`,
          )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /revision/:revisionId/child-branches', () => {
      it('owner can get child branches', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/child-branches`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(Array.isArray(result)).toBe(true);
      });

      it('another owner cannot get child branches (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/child-branches`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get child branches without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/child-branches`,
          )
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /revision/:revisionId/tables', () => {
      it('owner can get tables', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result.totalCount).toBeDefined();
      });

      it('another owner cannot get tables (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get tables without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
          .query({ first: 10 })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });
    });

    describe('GET /revision/:revisionId/endpoints', () => {
      it('owner can get endpoints', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}/endpoints`)
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.length).toBe(1);
      });

      it('another owner cannot get endpoints (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}/endpoints`)
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get endpoints without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${preparedData.project.draftRevisionId}/endpoints`)
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

    describe('POST /revision/:revisionId/child-branches', () => {
      it('another owner cannot create child branch (private project)', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.headRevisionId}/child-branches`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            branchName: 'test-branch',
          })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create child branch without authentication', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.headRevisionId}/child-branches`,
          )
          .send({
            branchName: 'test-branch',
          })
          .expect(401);
      });
    });

    describe('POST /revision/:revisionId/endpoints', () => {
      it('another owner cannot create endpoint (private project)', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/endpoints`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            type: EndpointType.GRAPHQL,
          })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create endpoint without authentication', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/endpoints`,
          )
          .send({
            type: EndpointType.GRAPHQL,
          })
          .expect(401);
      });
    });

    describe('POST /revision/:revisionId/tables', () => {
      it('another owner cannot create table (private project)', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            tableId: 'test-table',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          })
          .expect(403)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create table without authentication', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
          .send({
            tableId: 'test-table',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          })
          .expect(401);
      });
    });
  });

  describe('Write Operations - Success Cases', () => {
    describe('POST /revision/:revisionId/child-branches', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can create child branch', async () => {
        const branchName = `test-branch-${Date.now()}`;
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.headRevisionId}/child-branches`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            branchName,
          })
          .expect(201)
          .then((res) => res.body);

        expect(result.id).toBeDefined();
        expect(result.name).toBe(branchName);
        expect(result.projectId).toBe(preparedData.project.projectId);
      });
    });

    describe('POST /revision/:revisionId/endpoints', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);

        await prismaService.endpoint.deleteMany({
          where: {
            revisionId: preparedData.project.draftRevisionId,
          },
        });
      });

      it('owner can create endpoint', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/endpoints`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            type: EndpointType.GRAPHQL,
          })
          .expect(201)
          .then((res) => res.body);

        expect(result.id).toBeDefined();
        expect(result.type).toBe(EndpointType.GRAPHQL);
      });
    });

    describe('POST /revision/:revisionId/tables', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can create table', async () => {
        const tableId = `test-table-${Date.now()}`;
        const result = await request(app.getHttpServer())
          .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            tableId,
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  default: '',
                },
              },
              additionalProperties: false,
            },
          })
          .expect(201)
          .then((res) => res.body);

        expect(result.branch).toBeDefined();
        expect(result.table).toBeDefined();
        expect(result.table.id).toBeDefined();
      });
    });
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner can get revision (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(`/api/revision/${preparedData.project.draftRevisionId}`)
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe(preparedData.project.draftRevisionId);
    });

    it('can get revision without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(`/api/revision/${preparedData.project.draftRevisionId}`)
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe(preparedData.project.draftRevisionId);
    });

    it('can get endpoints without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(`/api/revision/${preparedData.project.draftRevisionId}/endpoints`)
        .expect(200)
        .then((res) => res.body);

      expect(Array.isArray(result)).toBe(true);
    });

    it('another owner cannot create table (no write permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          tableId: 'test-table',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        })
        .expect(/You are not allowed to create on Table/);
    });

    it('another owner cannot create endpoint (no write permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(`/api/revision/${preparedData.project.draftRevisionId}/endpoints`)
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          type: EndpointType.GRAPHQL,
        })
        .expect(/You are not allowed to create on Endpoint/);
    });

    it('another owner cannot create branch (no write permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/revision/${preparedData.project.draftRevisionId}/child-branches`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          branchName: 'test-branch',
        })
        .expect(/You are not allowed to create on Branch/);
    });
  });

  describe('Authorization Boundaries', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    it('should reject requests to non-existent revision', async () => {
      return request(app.getHttpServer())
        .get('/api/revision/non-existent-revision')
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should require authentication for protected endpoints', async () => {
      const baseUrl = `/api/revision/${preparedData.project.draftRevisionId}`;

      await request(app.getHttpServer())
        .post(`${baseUrl}/tables`)
        .send({
          tableId: 'test',
          schema: { type: 'object', properties: {} },
        })
        .expect(401);

      await request(app.getHttpServer())
        .post(`${baseUrl}/endpoints`)
        .send({ type: EndpointType.GRAPHQL })
        .expect(401);

      await request(app.getHttpServer())
        .post(`${baseUrl}/child-branches`)
        .send({ branchName: 'test' })
        .expect(401);
    });
  });

  describe('Edge Cases', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should handle invalid schema when creating table', async () => {
      return request(app.getHttpServer())
        .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          tableId: 'invalid-table',
          schema: 'invalid-schema',
        })
        .expect(500);
    });

    it('should handle duplicate table creation', async () => {
      const tableId = 'duplicate-table';

      await request(app.getHttpServer())
        .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          tableId,
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                type: 'string',
                default: '',
              },
            },
            additionalProperties: false,
          },
        })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/api/revision/${preparedData.project.draftRevisionId}/tables`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          tableId,
          schema: {
            type: 'object',
            properties: { name: { type: 'string', default: '' } },
            additionalProperties: false,
            required: ['name'],
          },
        })
        .expect(400);
    });

    it('should handle invalid endpoint type', async () => {
      return request(app.getHttpServer())
        .post(`/api/revision/${preparedData.project.draftRevisionId}/endpoints`)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          type: 'invalid-type',
        })
        .expect(500);
    });
  });
});
