import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createExpressImageFile } from 'src/__tests__/utils/file';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import * as request from 'supertest';

describe('restapi - row-by-id', () => {
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

  describe('GET /revision/:revisionId/tables/:tableId/rows/:rowId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get row', async () => {
      const result = await request(app.getHttpServer())
        .get(getRowUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.rowId);
      expect(result.versionId).toBe(preparedData.project.draftRowVersionId);
    });

    it('another owner cannot get row (private project)', async () => {
      return request(app.getHttpServer())
        .get(getRowUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get row without authentication (private project)', async () => {
      return request(app.getHttpServer()).get(getRowUrl()).expect(403);
    });

    it('should return 404 for non-existent row', async () => {
      const nonExistentRowId = 'non-existent-row-id';
      return request(app.getHttpServer())
        .get(getRowUrlWithRowId(nonExistentRowId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(404);
    });

    function getRowUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
    }

    function getRowUrlWithRowId(rowId: string) {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${rowId}`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/rows/:rowId/count-foreign-keys-by', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys by count', async () => {
      const result = await request(app.getHttpServer())
        .get(getCountForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.text);

      expect(result).toBe('0');
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
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/count-foreign-keys-by`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/rows/:rowId/foreign-keys-by', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys by', async () => {
      const result = await request(app.getHttpServer())
        .get(getForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(0);
    });

    it('another owner cannot get foreign keys by (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysByUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get foreign keys by without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysByUrl())
        .query({ first: 10 })
        .expect(403);
    });

    function getForeignKeysByUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/foreign-keys-by`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/rows/:rowId/count-foreign-keys-to', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys to count', async () => {
      const result = await request(app.getHttpServer())
        .get(getCountForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.text);

      expect(result).toBe('0');
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
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/count-foreign-keys-to`;
    }
  });

  describe('GET /revision/:revisionId/tables/:tableId/rows/:rowId/foreign-keys-to', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get foreign keys to', async () => {
      const result = await request(app.getHttpServer())
        .get(getForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(0);
    });

    it('another owner cannot get foreign keys to (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysToUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get foreign keys to without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getForeignKeysToUrl())
        .query({ first: 10 })
        .expect(403);
    });

    function getForeignKeysToUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/foreign-keys-to`;
    }
  });

  describe('DELETE /revision/:revisionId/tables/:tableId/rows/:rowId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can delete row', async () => {
      const result = await request(app.getHttpServer())
        .delete(getDeleteUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('branch');
      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('previousVersionTableId');
    });

    it('another owner cannot delete row (private project)', async () => {
      return request(app.getHttpServer())
        .delete(getDeleteUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot delete row without authentication', async () => {
      return request(app.getHttpServer()).delete(getDeleteUrl()).expect(401);
    });

    function getDeleteUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
    }
  });

  describe('PUT /revision/:revisionId/tables/:tableId/rows/:rowId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can update row', async () => {
      const result = await request(app.getHttpServer())
        .put(getUpdateUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          data: {
            ver: 5,
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('row');
      expect(result).toHaveProperty('previousVersionTableId');
      expect(result).toHaveProperty('previousVersionRowId');
      expect(result.row.data.ver).toBe(5);
    });

    it('another owner cannot update row (private project)', async () => {
      return request(app.getHttpServer())
        .put(getUpdateUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          data: {
            ver: 5,
          },
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot update row without authentication', async () => {
      return request(app.getHttpServer())
        .put(getUpdateUrl())
        .send({
          data: {
            ver: 5,
          },
        })
        .expect(401);
    });

    function getUpdateUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
    }
  });

  describe('PATCH /revision/:revisionId/tables/:tableId/rows/:rowId/rename', () => {
    let preparedData: PrepareDataReturnType;
    const nextRowId = 'nextRowId';

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can rename row', async () => {
      const result = await request(app.getHttpServer())
        .patch(getRenameUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          nextRowId,
        })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('row');
      expect(result).toHaveProperty('previousVersionTableId');
      expect(result).toHaveProperty('previousVersionRowId');
      expect(result.row.id).toBe(nextRowId);
    });

    it('another owner cannot rename row (private project)', async () => {
      return request(app.getHttpServer())
        .patch(getRenameUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          nextRowId,
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot rename row without authentication', async () => {
      return request(app.getHttpServer())
        .patch(getRenameUrl())
        .send({
          nextRowId,
        })
        .expect(401);
    });

    it('should throw error if row already exists', async () => {
      return request(app.getHttpServer())
        .patch(getRenameUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          nextRowId: preparedData.project.rowId,
        })
        .expect(/already exists in the table/);
    });

    function getRenameUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/rename`;
    }
  });

  describe('POST /revision/:revisionId/tables/:tableId/rows/:rowId/upload/:fileId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    xit('owner can upload file', async () => {
      const fileId = 'test-file-id';
      const file = createExpressImageFile();
      const result = await request(app.getHttpServer())
        .post(getUploadUrl(fileId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .attach('file', file.buffer, file.originalname)
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('row');
      expect(result).toHaveProperty('previousVersionTableId');
      expect(result).toHaveProperty('previousVersionRowId');
    });

    it('another owner cannot upload file (private project)', async () => {
      const fileId = 'test-file-id';
      return request(app.getHttpServer())
        .post(getUploadUrl(fileId))
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot upload file without authentication', async () => {
      const fileId = 'test-file-id';
      return request(app.getHttpServer())
        .post(getUploadUrl(fileId))
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(401);
    });

    it('should reject files larger than 50MB', async () => {
      const fileId = 'test-file-id';
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      return request(app.getHttpServer())
        .post(getUploadUrl(fileId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .attach('file', largeBuffer, 'large-file.txt')
        .expect(400);
    });

    function getUploadUrl(fileId: string) {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/upload/${fileId}`;
    }
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner can get row (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.rowId);
    });

    it('can get row without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`,
        )
        .expect(200)
        .then((res) => res.body);

      expect(result.id).toBe(preparedData.project.rowId);
    });

    it('can get foreign keys by without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/foreign-keys-by`,
        )
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('can get foreign keys to without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/foreign-keys-to`,
        )
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('totalCount');
    });

    it('another owner cannot delete row (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(/You are not allowed to delete on Row/);
    });

    it('another owner cannot update row (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .put(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          data: {
            ver: 5,
          },
        })
        .expect(/You are not allowed to update on Row/);
    });

    it('another owner cannot rename row (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/rename`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          nextRowId: 'new-row-id',
        })
        .expect(/You are not allowed to update on Row/);
    });

    it('another owner cannot upload file (no update permission on public project)', async () => {
      const fileId = 'test-file-id';
      return request(app.getHttpServer())
        .post(
          `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}/upload/${fileId}`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(/You are not allowed to update on Row/);
    });
  });
});
