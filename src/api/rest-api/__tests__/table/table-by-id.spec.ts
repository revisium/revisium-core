import { INestApplication } from '@nestjs/common';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import request from 'supertest';

describe('restapi - table-by-id', () => {
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

    describe('GET /revision/:revisionId/tables/:tableId', () => {
      it('owner can get table', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(preparedData.project.tableId);
        expect(result.versionId).toBe(preparedData.project.draftTableVersionId);
      });

      it('another owner cannot get table (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get table without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/count-rows', () => {
      it('owner can get row count', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result === 'number' || typeof result === 'object').toBe(
          true,
        );
      });

      it('another owner cannot get row count (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get row count without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-rows`,
          )
          .expect(403);
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/rows', () => {
      it('owner can get rows', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
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
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            first: 10,
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get rows without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .send({
            first: 10,
          })
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/schema', () => {
      it('owner can get schema', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/schema`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result).toBe('object');
      });

      it('another owner cannot get schema (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/schema`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get schema without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/schema`,
          )
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/count-foreign-keys-by', () => {
      it('owner can get foreign keys by count', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-by`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result === 'number' || typeof result === 'object').toBe(
          true,
        );
      });

      it('another owner cannot get foreign keys by count (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-by`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys by count without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-by`,
          )
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/foreign-keys-by', () => {
      it('owner can get foreign keys by', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-by`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('edges');
        expect(result).toHaveProperty('totalCount');
      });

      it('another owner cannot get foreign keys by (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-by`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .query({ first: 10 })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys by without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-by`,
          )
          .query({ first: 10 })
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/count-foreign-keys-to', () => {
      it('owner can get foreign keys to count', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-to`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result === 'number' || typeof result === 'object').toBe(
          true,
        );
      });

      it('another owner cannot get foreign keys to count (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-to`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys to count without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/count-foreign-keys-to`,
          )
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/foreign-keys-to', () => {
      it('owner can get foreign keys to', async () => {
        const result = await request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-to`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('edges');
        expect(result).toHaveProperty('totalCount');
      });

      it('another owner cannot get foreign keys to (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-to`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .query({ first: 10 })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys to without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/foreign-keys-to`,
          )
          .query({ first: 10 })
          .expect(403);
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/rows - orderBy and filtering', () => {
      it('should return rows with orderBy and where filters', async () => {
        const response = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
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
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
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
    });
  });

  describe('Write Operations - Error Cases', () => {
    let preparedData: PrepareDataReturnType;

    beforeAll(async () => {
      preparedData = await prepareData(app);
    });

    describe('POST /revision/:revisionId/tables/:tableId/create-rows', () => {
      it('another owner cannot create rows (private project)', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            rows: [{ rowId: 'test-row', data: { ver: 1 } }],
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create rows without authentication', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-rows`,
          )
          .send({
            rows: [{ rowId: 'test-row', data: { ver: 1 } }],
          })
          .expect(401);
      });

      it('should return error for duplicate row id', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rows: [{ rowId: preparedData.project.rowId, data: { ver: 3 } }],
          })
          .expect(400)
          .expect(/Rows already exist:/);
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/create-row', () => {
      it('another owner cannot create row (private project)', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            rowId: 'test-row-id',
            data: { ver: 3 },
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create row without authentication', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .send({
            rowId: 'test-row-id',
            data: { ver: 3 },
          })
          .expect(401);
      });

      it('should return validation error for invalid data type', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rowId: 'test-row-id',
            data: { ver: 'not-a-number' },
          })
          .expect(400)
          .expect(/must be number/);
      });

      it('should return validation error for missing required property', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rowId: 'test-row-id',
            data: {},
          })
          .expect(400)
          .expect(/missing required property/);
      });

      it('should return error for duplicate row id', async () => {
        return request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rowId: preparedData.project.rowId,
            data: { ver: 3 },
          })
          .expect(400)
          .expect(/Rows already exist:/);
      });

      it('should return structured error response for validation errors', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rowId: 'test-structured-error',
            data: { ver: 'not-a-number' },
          })
          .expect(400)
          .then((res) => res.body);

        expect(result).toHaveProperty('code', 'INVALID_DATA');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('details');
        expect(result.details).toHaveLength(1);
        expect(result.details[0]).toHaveProperty('path', '/ver');
        expect(result.details[0]).toHaveProperty('message', 'must be number');
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId', () => {
      it('another owner cannot delete table (private project)', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot delete table without authentication', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .expect(401);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId', () => {
      it('another owner cannot update table (private project)', async () => {
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
                value: { type: 'string', default: 'updated' },
              },
            ],
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot update table without authentication', async () => {
        return request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .send({
            patches: [
              {
                op: 'replace',
                path: '/properties/ver',
                value: { type: 'string', default: 'updated' },
              },
            ],
          })
          .expect(401);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/rename', () => {
      it('another owner cannot rename table (private project)', async () => {
        return request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rename`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({ nextTableId: 'nextTableId' })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot rename table without authentication', async () => {
        return request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rename`,
          )
          .send({ nextTableId: 'nextTableId' })
          .expect(401);
      });

      it('should throw error if IDs are the same', async () => {
        return request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rename`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({ nextTableId: preparedData.project.tableId })
          .expect(/New ID must be different from current/);
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId/rows', () => {
      it('another owner cannot delete rows (private project)', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({ rowIds: [preparedData.project.rowId] })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot delete rows without authentication', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .send({ rowIds: [preparedData.project.rowId] })
          .expect(401);
      });

      it('should fail for empty rowIds array', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({ rowIds: [] })
          .expect(400)
          .expect(/rowIds array cannot be empty/);
      });

      it('should fail for non-existent row', async () => {
        return request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({ rowIds: ['non-existent-row-id'] })
          .expect(/Rows not found in table/);
      });
    });

    describe('PUT /revision/:revisionId/tables/:tableId/update-rows', () => {
      it('another owner cannot update rows (private project)', async () => {
        return request(app.getHttpServer())
          .put(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/update-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            rows: [{ rowId: preparedData.project.rowId, data: { ver: 100 } }],
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot update rows without authentication', async () => {
        return request(app.getHttpServer())
          .put(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/update-rows`,
          )
          .send({
            rows: [{ rowId: preparedData.project.rowId, data: { ver: 100 } }],
          })
          .expect(401);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/patch-rows', () => {
      it('another owner cannot patch rows (private project)', async () => {
        return request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/patch-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
          .send({
            rows: [
              {
                rowId: preparedData.project.rowId,
                patches: [{ op: 'replace', path: 'ver', value: 200 }],
              },
            ],
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot patch rows without authentication', async () => {
        return request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/patch-rows`,
          )
          .send({
            rows: [
              {
                rowId: preparedData.project.rowId,
                patches: [{ op: 'replace', path: 'ver', value: 200 }],
              },
            ],
          })
          .expect(401);
      });
    });
  });

  describe('Write Operations - Success Cases', () => {
    describe('POST /revision/:revisionId/tables/:tableId/create-rows', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can create multiple rows', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rows: [
              { rowId: 'row-1', data: { ver: 10 } },
              { rowId: 'row-2', data: { ver: 20 } },
            ],
          })
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('previousVersionTableId');
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0].data.ver).toBe(10);
        expect(result.rows[1].data.ver).toBe(20);
      });

      it('should accept isRestore flag', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rows: [{ rowId: 'restored-row', data: { ver: 5 } }],
            isRestore: true,
          })
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].id).toBe('restored-row');
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/create-row', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can create row', async () => {
        const result = await request(app.getHttpServer())
          .post(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-row`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rowId: 'test-row-id',
            data: { ver: 3 },
          })
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result).toHaveProperty('row');
        expect(result).toHaveProperty('previousVersionTableId');
        expect(result.row.data.ver).toBe(3);
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can delete table', async () => {
        const result = await request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('projectId');
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can update table', async () => {
        const result = await request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            patches: [
              {
                op: 'replace',
                path: '/properties/ver',
                value: { type: 'string', default: 'updated' },
              },
            ],
          })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result).toHaveProperty('previousVersionTableId');
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/rename', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can rename table', async () => {
        const result = await request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rename`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({ nextTableId: 'nextTableId' })
          .expect(200)
          .then((res) => res.body);

        expect(result.previousVersionTableId).toBe(
          preparedData.project.draftTableVersionId,
        );
        expect(result.table.id).toBe('nextTableId');
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId/rows', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can delete rows', async () => {
        const result = await request(app.getHttpServer())
          .delete(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({ rowIds: [preparedData.project.rowId] })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('branch');
        expect(result).toHaveProperty('table');
        expect(result).toHaveProperty('previousVersionTableId');
        expect(result.branch.id).toBe(preparedData.project.branchId);
      });
    });

    describe('PUT /revision/:revisionId/tables/:tableId/update-rows', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can update multiple rows', async () => {
        const result = await request(app.getHttpServer())
          .put(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/update-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rows: [{ rowId: preparedData.project.rowId, data: { ver: 100 } }],
          })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('previousVersionTableId');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].data.ver).toBe(100);
      });

      it('should accept isRestore flag', async () => {
        const result = await request(app.getHttpServer())
          .put(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/update-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rows: [{ rowId: preparedData.project.rowId, data: { ver: 200 } }],
            isRestore: true,
          })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].data.ver).toBe(200);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/patch-rows', () => {
      let preparedData: PrepareDataReturnType;

      beforeEach(async () => {
        preparedData = await prepareData(app);
      });

      it('owner can patch multiple rows', async () => {
        const result = await request(app.getHttpServer())
          .patch(
            `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/patch-rows`,
          )
          .set('Authorization', `Bearer ${preparedData.owner.token}`)
          .send({
            rows: [
              {
                rowId: preparedData.project.rowId,
                patches: [{ op: 'replace', path: 'ver', value: 200 }],
              },
            ],
          })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('table');
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('previousVersionTableId');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].data.ver).toBe(200);
      });
    });
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

    it('another owner cannot delete rows (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          rowIds: [preparedData.project.rowId],
        })
        .expect(/You are not allowed to delete on Row/);
    });

    it('another owner cannot create rows (no create permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/create-rows`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          rows: [{ rowId: 'test-row', data: { ver: 1 } }],
        })
        .expect(/You are not allowed to create on Row/);
    });

    it('another owner cannot update rows (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .put(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/update-rows`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          rows: [{ rowId: preparedData.project.rowId, data: { ver: 100 } }],
        })
        .expect(/You are not allowed to update on Row/);
    });

    it('another owner cannot patch rows (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/patch-rows`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          rows: [
            {
              rowId: preparedData.project.rowId,
              patches: [{ op: 'replace', path: 'ver', value: 200 }],
            },
          ],
        })
        .expect(/You are not allowed to update on Row/);
    });
  });
});
