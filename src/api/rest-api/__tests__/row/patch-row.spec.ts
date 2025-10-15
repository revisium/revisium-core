import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import * as request from 'supertest';

describe('restapi - patch-row', () => {
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

  describe('PATCH /revision/:revisionId/tables/:tableId/rows/:rowId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can patch row', async () => {
      const result = await request(app.getHttpServer())
        .patch(getPatchUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 10,
            },
          ],
        })
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('row');
      expect(result).toHaveProperty('previousVersionTableId');
      expect(result).toHaveProperty('previousVersionRowId');
      expect(result.row.data.ver).toBe(10);
    });

    it('owner can patch field value', async () => {
      const result = await request(app.getHttpServer())
        .patch(getPatchUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 25,
            },
          ],
        })
        .expect(200)
        .then((res) => res.body);

      expect(result.row.data.ver).toBe(25);
    });

    it('another owner cannot patch row (private project)', async () => {
      return request(app.getHttpServer())
        .patch(getPatchUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 10,
            },
          ],
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot patch row without authentication', async () => {
      return request(app.getHttpServer())
        .patch(getPatchUrl())
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 10,
            },
          ],
        })
        .expect(401);
    });

    it('should validate empty patches array', async () => {
      return request(app.getHttpServer())
        .patch(getPatchUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          patches: [],
        })
        .expect(200);
    });

    function getPatchUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
    }
  });

  describe('PATCH /revision/:revisionId/tables/:tableId/rows/:rowId - Public Projects', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner cannot patch row (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(getPatchUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 10,
            },
          ],
        })
        .expect(/You are not allowed to update on Row/);
    });

    it('cannot patch row without authentication (no update permission on public project)', async () => {
      return request(app.getHttpServer())
        .patch(getPatchUrl())
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 10,
            },
          ],
        })
        .expect(401);
    });

    it('owner can still patch row in public project', async () => {
      const result = await request(app.getHttpServer())
        .patch(getPatchUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          patches: [
            {
              op: 'replace',
              path: 'ver',
              value: 30,
            },
          ],
        })
        .expect(200)
        .then((res) => res.body);

      expect(result.row.data.ver).toBe(30);
    });

    function getPatchUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
    }
  });
});
