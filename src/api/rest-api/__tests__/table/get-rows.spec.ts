import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import * as request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

describe('restapi - table rows', () => {
  describe('POST /rows with orderBy', () => {
    it('should return rows', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl())
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

    function getUrl() {
      return `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows`;
    }
  });

  let app: INestApplication;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let preparedData: PrepareDataReturnType;

  beforeEach(async () => {
    preparedData = await prepareData(app);
  });
});
