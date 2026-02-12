import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import request from 'supertest';

describe('restapi - revision-changes', () => {
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

  describe('GET /revision/:revisionId/changes', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get revision changes', async () => {
      const result = await request(app.getHttpServer())
        .get(getChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.revisionId).toBe(preparedData.project.draftRevisionId);
      expect(result.totalChanges).toBeDefined();
      expect(result.tablesSummary).toBeDefined();
      expect(result.rowsSummary).toBeDefined();
    });

    it('another owner cannot get revision changes (private project)', async () => {
      return request(app.getHttpServer())
        .get(getChangesUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get revision changes without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getChangesUrl())
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('returns changes when table was created in draft', async () => {
      const result = await request(app.getHttpServer())
        .get(getChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.totalChanges).toBeGreaterThan(0);
      expect(result.tablesSummary.total).toBeGreaterThan(0);
    });

    function getChangesUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/changes`;
    }
  });

  describe('GET /revision/:revisionId/table-changes', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get table changes', async () => {
      const result = await request(app.getHttpServer())
        .get(getTableChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });

    it('another owner cannot get table changes (private project)', async () => {
      return request(app.getHttpServer())
        .get(getTableChangesUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get table changes without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getTableChangesUrl())
        .query({ first: 10 })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('returns table changes with details', async () => {
      const result = await request(app.getHttpServer())
        .get(getTableChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.edges.length).toBeGreaterThan(0);
      const tableChange = result.edges[0].node;
      expect(tableChange.tableId).toBeDefined();
      expect(tableChange.changeType).toBeDefined();
      expect(tableChange.rowChangesCount).toBeDefined();
    });

    function getTableChangesUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/table-changes`;
    }
  });

  describe('GET /revision/:revisionId/row-changes', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get row changes', async () => {
      const result = await request(app.getHttpServer())
        .get(getRowChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });

    it('another owner cannot get row changes (private project)', async () => {
      return request(app.getHttpServer())
        .get(getRowChangesUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get row changes without authentication (private project)', async () => {
      return request(app.getHttpServer())
        .get(getRowChangesUrl())
        .query({ first: 10 })
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('returns row changes with details', async () => {
      const result = await request(app.getHttpServer())
        .get(getRowChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.edges.length).toBeGreaterThan(0);
      const rowChange = result.edges[0].node;
      expect(rowChange.changeType).toBeDefined();
      expect(rowChange.fieldChanges).toBeDefined();
    });

    it('supports tableId filter', async () => {
      const result = await request(app.getHttpServer())
        .get(getRowChangesUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10, tableId: preparedData.project.tableId })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
      expect(result.edges).toBeDefined();
    });

    function getRowChangesUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/row-changes`;
    }
  });

  describe('Public Project Access Tests', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('can get revision changes without authentication (public project)', async () => {
      const url = `/api/revision/${preparedData.project.draftRevisionId}/changes`;
      const result = await request(app.getHttpServer())
        .get(url)
        .expect(200)
        .then((res) => res.body);

      expect(result.revisionId).toBe(preparedData.project.draftRevisionId);
      expect(result.totalChanges).toBeDefined();
    });

    it('another owner can get revision changes (public project)', async () => {
      const url = `/api/revision/${preparedData.project.draftRevisionId}/changes`;
      const result = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.revisionId).toBe(preparedData.project.draftRevisionId);
    });

    it('can get table changes without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/table-changes`,
        )
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
      expect(result.edges).toBeDefined();
    });

    it('another owner can get table changes (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/table-changes`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
    });

    it('can get row changes without authentication (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/row-changes`,
        )
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
      expect(result.edges).toBeDefined();
    });

    it('another owner can get row changes (public project)', async () => {
      const result = await request(app.getHttpServer())
        .get(
          `/api/revision/${preparedData.project.draftRevisionId}/row-changes`,
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBeDefined();
    });
  });

  describe('Empty Changes', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('returns zero changes for head revision', async () => {
      const url = `/api/revision/${preparedData.project.headRevisionId}/changes`;
      const result = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.totalChanges).toBe(0);
      expect(result.tablesSummary.total).toBe(0);
      expect(result.rowsSummary.total).toBe(0);
    });

    it('returns empty table changes for head revision', async () => {
      const url = `/api/revision/${preparedData.project.headRevisionId}/table-changes`;
      const result = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(0);
      expect(result.edges).toHaveLength(0);
    });

    it('returns empty row changes for head revision', async () => {
      const url = `/api/revision/${preparedData.project.headRevisionId}/row-changes`;
      const result = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .query({ first: 10 })
        .expect(200)
        .then((res) => res.body);

      expect(result.totalCount).toBe(0);
      expect(result.edges).toHaveLength(0);
    });
  });
});
