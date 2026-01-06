import { INestApplication } from '@nestjs/common';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import {
  loadSnapshot,
  resetSnapshotLoadedState,
  tableByIdManifest,
  getFixtureAuth,
} from 'src/__tests__/fixtures';
import request from 'supertest';

const m = tableByIdManifest;

describe('restapi - table-by-id', () => {
  let app: INestApplication;
  let ownerToken: string;
  let anotherOwnerToken: string;

  beforeAll(async () => {
    app = await createFreshTestApp();
    resetSnapshotLoadedState();
    await loadSnapshot();

    const auth = getFixtureAuth(app);
    ownerToken = auth.ownerToken;
    anotherOwnerToken = auth.anotherOwnerToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Read Operations', () => {
    describe('GET /revision/:revisionId/tables/:tableId', () => {
      it('owner can get table', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(m.table.tableId);
        expect(result.versionId).toBe(m.table.draftVersionId);
      });

      it('another owner cannot get table (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get table without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/count-rows', () => {
      it('owner can get row count', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result === 'number' || typeof result === 'object').toBe(true);
      });

      it('another owner cannot get row count (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-rows`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get row count without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-rows`)
          .expect(403);
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/rows', () => {
      it('owner can get rows', async () => {
        const result = await request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('edges');
        expect(result).toHaveProperty('totalCount');
      });

      it('another owner cannot get rows (private project)', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ first: 10 })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get rows without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .send({ first: 10 })
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/schema', () => {
      it('owner can get schema', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/schema`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result).toBe('object');
      });

      it('another owner cannot get schema (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/schema`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get schema without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/schema`)
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/count-foreign-keys-by', () => {
      it('owner can get foreign keys by count', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-foreign-keys-by`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result === 'number' || typeof result === 'object').toBe(true);
      });

      it('another owner cannot get foreign keys by count (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-foreign-keys-by`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys by count without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-foreign-keys-by`)
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/foreign-keys-by', () => {
      it('owner can get foreign keys by', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/foreign-keys-by`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('edges');
        expect(result).toHaveProperty('totalCount');
      });

      it('another owner cannot get foreign keys by (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/foreign-keys-by`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .query({ first: 10 })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys by without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/foreign-keys-by`)
          .query({ first: 10 })
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/count-foreign-keys-to', () => {
      it('owner can get foreign keys to count', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-foreign-keys-to`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
          .then((res) => res.body);

        expect(typeof result === 'number' || typeof result === 'object').toBe(true);
      });

      it('another owner cannot get foreign keys to count (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-foreign-keys-to`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys to count without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/count-foreign-keys-to`)
          .expect(403);
      });
    });

    describe('GET /revision/:revisionId/tables/:tableId/foreign-keys-to', () => {
      it('owner can get foreign keys to', async () => {
        const result = await request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/foreign-keys-to`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .query({ first: 10 })
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('edges');
        expect(result).toHaveProperty('totalCount');
      });

      it('another owner cannot get foreign keys to (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/foreign-keys-to`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .query({ first: 10 })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot get foreign keys to without authentication (private project)', async () => {
        return request(app.getHttpServer())
          .get(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/foreign-keys-to`)
          .query({ first: 10 })
          .expect(403);
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/rows - orderBy and filtering', () => {
      it('should return rows with orderBy and where filters', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            first: 10,
            orderBy: [{ field: 'id', direction: 'asc' }],
            where: { id: { equals: m.row.rowId } },
          })
          .expect(200)
          .then((res) => res.body);

        expect(response.totalCount).toEqual(1);
      });

      it('should return 400 for invalid where filter', async () => {
        const invalidProp = 'nonExistentField';
        const errorResponse = await request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
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
    describe('POST /revision/:revisionId/tables/:tableId/create-rows', () => {
      it('another owner cannot create rows (private project)', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-rows`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ rows: [{ rowId: 'test-row', data: { ver: 1 } }] })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create rows without authentication', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-rows`)
          .send({ rows: [{ rowId: 'test-row', data: { ver: 1 } }] })
          .expect(401);
      });

      it('should return error for duplicate row id', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rows: [{ rowId: m.row.rowId, data: { ver: 3 } }] })
          .expect(400)
          .expect(/Rows already exist:/);
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/create-row', () => {
      it('another owner cannot create row (private project)', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-row`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ rowId: 'test-row-id', data: { ver: 3 } })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot create row without authentication', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-row`)
          .send({ rowId: 'test-row-id', data: { ver: 3 } })
          .expect(401);
      });

      it('should return validation error for invalid data type', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-row`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowId: 'test-row-id', data: { ver: 'not-a-number' } })
          .expect(400)
          .expect(/must be number/);
      });

      it('should return validation error for missing required property', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-row`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowId: 'test-row-id', data: {} })
          .expect(400)
          .expect(/missing required property/);
      });

      it('should return error for duplicate row id', async () => {
        return request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-row`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowId: m.row.rowId, data: { ver: 3 } })
          .expect(400)
          .expect(/Rows already exist:/);
      });

      it('should return structured error response for validation errors', async () => {
        const result = await request(app.getHttpServer())
          .post(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/create-row`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowId: 'test-structured-error', data: { ver: 'not-a-number' } })
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
          .delete(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot delete table without authentication', async () => {
        return request(app.getHttpServer())
          .delete(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .expect(401);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId', () => {
      it('another owner cannot update table (private project)', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({
            patches: [{ op: 'replace', path: '/properties/ver', value: { type: 'string', default: 'updated' } }],
          })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot update table without authentication', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}`)
          .send({
            patches: [{ op: 'replace', path: '/properties/ver', value: { type: 'string', default: 'updated' } }],
          })
          .expect(401);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/rename', () => {
      it('another owner cannot rename table (private project)', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rename`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ nextTableId: 'nextTableId' })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot rename table without authentication', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rename`)
          .send({ nextTableId: 'nextTableId' })
          .expect(401);
      });

      it('should throw error if IDs are the same', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rename`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ nextTableId: m.table.tableId })
          .expect(/New ID must be different from current/);
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId/rows', () => {
      it('another owner cannot delete rows (private project)', async () => {
        return request(app.getHttpServer())
          .delete(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ rowIds: [m.row.rowId] })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot delete rows without authentication', async () => {
        return request(app.getHttpServer())
          .delete(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .send({ rowIds: [m.row.rowId] })
          .expect(401);
      });

      it('should fail for empty rowIds array', async () => {
        return request(app.getHttpServer())
          .delete(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowIds: [] })
          .expect(400)
          .expect(/rowIds array cannot be empty/);
      });

      it('should fail for non-existent row', async () => {
        return request(app.getHttpServer())
          .delete(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowIds: ['non-existent-row-id'] })
          .expect(/Rows not found in table/);
      });
    });

    describe('PUT /revision/:revisionId/tables/:tableId/update-rows', () => {
      it('another owner cannot update rows (private project)', async () => {
        return request(app.getHttpServer())
          .put(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/update-rows`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ rows: [{ rowId: m.row.rowId, data: { ver: 100 } }] })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot update rows without authentication', async () => {
        return request(app.getHttpServer())
          .put(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/update-rows`)
          .send({ rows: [{ rowId: m.row.rowId, data: { ver: 100 } }] })
          .expect(401);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/patch-rows', () => {
      it('another owner cannot patch rows (private project)', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/patch-rows`)
          .set('Authorization', `Bearer ${anotherOwnerToken}`)
          .send({ rows: [{ rowId: m.row.rowId, patches: [{ op: 'replace', path: 'ver', value: 200 }] }] })
          .expect(/You are not allowed to read on Project/);
      });

      it('cannot patch rows without authentication', async () => {
        return request(app.getHttpServer())
          .patch(`/api/revision/${m.project.draftRevisionId}/tables/${m.table.tableId}/patch-rows`)
          .send({ rows: [{ rowId: m.row.rowId, patches: [{ op: 'replace', path: 'ver', value: 200 }] }] })
          .expect(401);
      });
    });
  });

  describe('Write Success Cases', () => {
    describe('POST /revision/:revisionId/tables/:tableId/create-rows', () => {
      it('owner can create rows', async () => {
        const w = m.writeCreateRows;
        const result = await request(app.getHttpServer())
          .post(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}/create-rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rows: [{ rowId: 'new-row-1', data: { ver: 10 } }] })
          .expect(201)
          .then((res) => res.body);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].id).toBe('new-row-1');
      });
    });

    describe('POST /revision/:revisionId/tables/:tableId/create-row', () => {
      it('owner can create single row', async () => {
        const w = m.writeCreateRows;
        const result = await request(app.getHttpServer())
          .post(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}/create-row`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowId: 'new-row-2', data: { ver: 20 } })
          .expect(201)
          .then((res) => res.body);

        expect(result.row.id).toBe('new-row-2');
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId', () => {
      it('owner can delete table', async () => {
        const w = m.writeDeleteTable;
        const result = await request(app.getHttpServer())
          .delete(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
          .then((res) => res.body);

        expect(result.id).toBe(w.branchId);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId', () => {
      it('owner can update table schema', async () => {
        const w = m.writeUpdateTable;
        const result = await request(app.getHttpServer())
          .patch(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            patches: [{ op: 'add', path: '/properties/newField', value: { type: 'string', default: '' } }],
          })
          .expect(200)
          .then((res) => res.body);

        expect(result.table.id).toBe(w.tableId);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/rename', () => {
      it('owner can rename table', async () => {
        const w = m.writeRenameTable;
        const result = await request(app.getHttpServer())
          .patch(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}/rename`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ nextTableId: 'renamed-table' })
          .expect(200)
          .then((res) => res.body);

        expect(result.table.id).toBe('renamed-table');
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId/rows', () => {
      it('owner can delete rows', async () => {
        const w = m.writeDeleteRows;
        const result = await request(app.getHttpServer())
          .delete(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}/rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rowIds: [w.rowId] })
          .expect(200)
          .then((res) => res.body);

        expect(result.table.id).toBe(w.tableId);
        expect(result.branch).toBeDefined();
      });
    });

    describe('PUT /revision/:revisionId/tables/:tableId/update-rows', () => {
      it('owner can update rows', async () => {
        const w = m.writeUpdateRows;
        const result = await request(app.getHttpServer())
          .put(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}/update-rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rows: [{ rowId: w.rowId, data: { ver: 999 } }] })
          .expect(200)
          .then((res) => res.body);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].id).toBe(w.rowId);
      });
    });

    describe('PATCH /revision/:revisionId/tables/:tableId/patch-rows', () => {
      it('owner can patch rows', async () => {
        const w = m.writePatchRows;
        const result = await request(app.getHttpServer())
          .patch(`/api/revision/${w.draftRevisionId}/tables/${w.tableId}/patch-rows`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ rows: [{ rowId: w.rowId, patches: [{ op: 'replace', path: 'ver', value: 888 }] }] })
          .expect(200)
          .then((res) => res.body);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].id).toBe(w.rowId);
      });
    });
  });

  describe('Public Project Access Tests', () => {
    it('another owner can get table (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(m.publicTable.tableId);
    });

    it('can get table without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(m.publicTable.tableId);
    });

    it('can get rows without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .post(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}/rows`)
        .send({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('another owner cannot create row (no write permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}/create-row`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .send({ rowId: 'test-row-id', data: { ver: 3 } })
        .expect(/You are not allowed to create on Row/);
    });

    it('another owner cannot delete table (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .expect(/You are not allowed to delete on Table/);
    });

    it('another owner cannot update table (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .send({
          patches: [{ op: 'replace', path: '/properties/ver', value: { type: 'string', default: 'updated' } }],
        })
        .expect(/You are not allowed to update on Table/);
    });

    it('another owner cannot delete rows (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}/rows`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .send({ rowIds: [m.publicRow.rowId] })
        .expect(/You are not allowed to delete on Row/);
    });

    it('another owner cannot create rows (no create permission on public project)', async () => {
      return request(app.getHttpServer())
        .post(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}/create-rows`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .send({ rows: [{ rowId: 'test-row', data: { ver: 1 } }] })
        .expect(/You are not allowed to create on Row/);
    });

    it('another owner cannot update rows (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .put(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}/update-rows`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .send({ rows: [{ rowId: m.publicRow.rowId, data: { ver: 100 } }] })
        .expect(/You are not allowed to update on Row/);
    });

    it('another owner cannot patch rows (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(`/api/revision/${m.publicProject.draftRevisionId}/tables/${m.publicTable.tableId}/patch-rows`)
        .set('Authorization', `Bearer ${anotherOwnerToken}`)
        .send({ rows: [{ rowId: m.publicRow.rowId, patches: [{ op: 'replace', path: 'ver', value: 200 }] }] })
        .expect(/You are not allowed to update on Row/);
    });
  });
});
