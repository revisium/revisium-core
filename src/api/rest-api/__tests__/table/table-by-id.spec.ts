import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import request from 'supertest';

describe('restapi - table-by-id', () => {
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

  const makeProjectPublic = async (projectId: string) => {
    await prismaService.project.update({
      where: { id: projectId },
      data: { isPublic: true },
    });
  };

  describe('GET /revision/:revisionId/tables/:tableId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get table', async () => {
      const result = await request(app.getHttpServer())
        .get(getTableUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.tableId);
      expect(result.versionId).toBe(preparedData.project.draftTableVersionId);
    });

    it('another owner cannot get table (private project)', async () => {
      return request(app.getHttpServer())
        .get(getTableUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get table without authentication (private project)', async () => {
      return request(app.getHttpServer()).get(getTableUrl()).expect(403);
    });

    function getTableUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/count-rows', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get row count', async () => {
      const result = await request(app.getHttpServer())
        .get(getCountRowsUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(typeof result === 'number' || typeof result === 'object').toBe(
        true,
      );
    });

    it('another owner cannot get row count (private project)', async () => {
      return request(app.getHttpServer())
        .get(getCountRowsUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get row count without authentication (private project)', async () => {
      return request(app.getHttpServer()).get(getCountRowsUrl()).expect(403);
    });

    function getCountRowsUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-rows`;
    }
  });

  describe('POST /revision/:revisionId/tables/:tableId/rows', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get rows', async () => {
      const result = await request(app.getHttpServer())
        .post(getRowsUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          first: 10,
        })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('another owner cannot get rows (private project)', async () => {
      return request(app.getHttpServer())
        .post(getRowsUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          first: 10,
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get rows without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .post(getRowsUrl())
        .send({
          first: 10,
        })
        .expect(403);
    });

    function getRowsUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`;
    }
  });

  describe('POST /revision/:revisionId/tables/:tableId/create-row', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can create row', async () => {
      const result = await request(app.getHttpServer())
        .post(getCreateRowUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          rowId: 'test-row-id',
          data: {
            ver: 3,
          },
        })
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('row');
      expect(result).toHaveProperty('previousVersionTableId');
      expect(result.row.data.ver).toBe(3);
    });

    it('another owner cannot create row (private project)', async () => {
      return request(app.getHttpServer())
        .post(getCreateRowUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          rowId: 'test-row-id',
          data: {
            ver: 3,
          },
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot create row without authentication', async () => {
      return request(app.getHttpServer())
        .post(getCreateRowUrl())
        .send({
          rowId: 'test-row-id',
          data: {
            ver: 3,
          },
        })
        .expect(401);
    });

    function getCreateRowUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/schema', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get schema', async () => {
      const result = await request(app.getHttpServer())
        .get(getSchemaUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(typeof result).toBe('object');
    });

    it('another owner cannot get schema (private project)', async () => {
      return request(app.getHttpServer())
        .get(getSchemaUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get schema without authentication (private project)', async () => {
      return request(app.getHttpServer()).get(getSchemaUrl()).expect(403);
    });

    function getSchemaUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/schema`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/count-foreign-keys-by', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys by count', async () => {
      const result = await request(app.getHttpServer())
        .get(getCountForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(typeof result === 'number' || typeof result === 'object').toBe(
        true,
      );
    });

    it('another owner cannot get foreign keys by count (private project)', async () => {
      return request(app.getHttpServer())
        .get(getCountForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get foreign keys by count without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getCountForeignKeysByUrl())
        .expect(403);
    });

    function getCountForeignKeysByUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-by`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/foreign-keys-by', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys by', async () => {
      const result = await request(app.getHttpServer())
        .get(getForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ limit: 10, offset: 0 })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('another owner cannot get foreign keys by (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ limit: 10, offset: 0 })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get foreign keys by without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysByUrl())
        .query({ limit: 10, offset: 0 })
        .expect(403);
    });

    function getForeignKeysByUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-by`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/count-foreign-keys-to', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys to count', async () => {
      const result = await request(app.getHttpServer())
        .get(getCountForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(typeof result === 'number' || typeof result === 'object').toBe(
        true,
      );
    });

    it('another owner cannot get foreign keys to count (private project)', async () => {
      return request(app.getHttpServer())
        .get(getCountForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get foreign keys to count without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getCountForeignKeysToUrl())
        .expect(403);
    });

    function getCountForeignKeysToUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-to`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/foreign-keys-to', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys to', async () => {
      const result = await request(app.getHttpServer())
        .get(getForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ limit: 10, offset: 0 })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('another owner cannot get foreign keys to (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ limit: 10, offset: 0 })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get foreign keys to without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysToUrl())
        .query({ limit: 10, offset: 0 })
        .expect(403);
    });

    function getForeignKeysToUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-to`;
    }
  });

  describe('DELETE /revision/:revisionId/tables/:tableId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can delete table', async () => {
      const result = await request(app.getHttpServer())
        .delete(getDeleteUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('projectId');
    });

    it('another owner cannot delete table (private project)', async () => {
      return request(app.getHttpServer())
        .delete(getDeleteUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot delete table without authentication', async () => {
      return request(app.getHttpServer()).delete(getDeleteUrl()).expect(401);
    });

    function getDeleteUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`;
    }
  });

  describe('PATCH /revision/:revisionId/tables/:tableId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can update table', async () => {
      const result = await request(app.getHttpServer())
        .patch(getUpdateUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: '/properties/ver',
              value: {
                type: 'string',
                default: 'updated',
              },
            },
          ],
        })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('previousVersionTableId');
    });

    it('another owner cannot update table (private project)', async () => {
      return request(app.getHttpServer())
        .patch(getUpdateUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: '/properties/ver',
              value: {
                type: 'string',
                default: 'updated',
              },
            },
          ],
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot update table without authentication', async () => {
      return request(app.getHttpServer())
        .patch(getUpdateUrl())
        .send({
          patches: [
            {
              op: 'replace',
              path: '/properties/ver',
              value: {
                type: 'string',
                default: 'updated',
              },
            },
          ],
        })
        .expect(401);
    });

    function getUpdateUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`;
    }
  });

  describe('PATCH /revision/:revisionId/tables/:tableId/rename', () => {
    let preparedData: PrepareDataReturnType;
    const nextTableId = 'nextTableId';

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can rename table', async () => {
      const result = await request(app.getHttpServer())
        .patch(getRenameUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          nextTableId,
        })
        .expect(200)
        .then((res) => res.body);

      expect(result.previousVersionTableId).toBe(
        preparedData.project.draftTableVersionId,
      );
      expect(result.table.id).toBe(nextTableId);
    });

    it('another owner cannot rename table (private project)', async () => {
      return request(app.getHttpServer())
        .patch(getRenameUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          nextTableId,
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot rename table without authentication', async () => {
      return request(app.getHttpServer())
        .patch(getRenameUrl())
        .send({
          nextTableId,
        })
        .expect(401);
    });

    it('should throw error if table already exists', async () => {
      return request(app.getHttpServer())
        .patch(getRenameUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          nextTableId: preparedData.project.tableId,
        })
        .expect(/A table with this name already exists in the revision/);
    });

    function getRenameUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rename`;
    }
  });

  describe('POST /revision/:revisionId/tables/:tableId/rows - orderBy and filtering', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should return rows with orderBy and where filters', async () => {
      const response = await request(app.getHttpServer())
        .post(getRowsUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          first: 10,
          orderBy: [{ field: 'id', direction: 'asc' }],
          where: { id: { equals: preparedData.project.rowId } },
        })
        .expect(200)
        .then((res) => res.body);

      expect(response.totalCount).toEqual(1);
    });

    it('should return 400 for invalid where filter', async () => {
      const invalidProp = 'nonExistentField';
      const errorResponse = await request(app.getHttpServer())
        .post(getRowsUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          first: 10,
          orderBy: [{ field: 'id', direction: 'asc' }],
          where: { [invalidProp]: { equals: 'value' } },
        })
        .expect(400)
        .then((res) => res.body);

      expect(errorResponse.statusCode).toBe(400);
      expect(errorResponse.message).toEqual(
        expect.arrayContaining([expect.stringMatching(invalidProp)]),
      );
      expect(errorResponse.error).toBe('Bad Request');
    });

    function getRowsUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`;
    }
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner can get table (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.tableId);
    });

    it('can get table without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
        )
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.tableId);
    });

    it('can get rows without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .post(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
        )
        .send({
          first: 10,
        })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('another owner cannot create row (no write permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          rowId: 'test-row-id',
          data: {
            ver: 3,
          },
        })
        .expect(/You are not allowed to create on Row/);
    });

    it('another owner cannot delete table (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to delete on Table/);
    });

    it('another owner cannot update table (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: '/properties/ver',
              value: {
                type: 'string',
                default: 'updated',
              },
            },
          ],
        })
        .expect(/You are not allowed to update on Table/);
    });
  });
});
