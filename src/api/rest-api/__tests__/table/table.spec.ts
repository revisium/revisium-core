import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import * as request from 'supertest';

describe('restapi - table', () => {
  let app: INestApplication;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('renameTable', () => {
    const nextTableId = 'nextTableId';
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can perform patching', async () => {
      const result = await request(app.getHttpServer())
        .patch(getUrl())
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

    it('another owner cannot perform patching', async () => {
      return request(app.getHttpServer())
        .patch(getUrl())
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .send({
          nextTableId,
        })
        .expect(/You are not allowed to read on Project/);
    });

    it('should throw error if table already exists', async () => {
      return request(app.getHttpServer())
        .patch(getUrl())
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .send({
          nextTableId: preparedData.project.tableId,
        })
        .expect(/A table with this name already exists in the revision/);
    });

    function getUrl() {
      return `/-/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rename`;
    }
  });
});
