import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareBranch';
import { graphqlQuery } from 'src/__tests__/utils/queryTest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

describe('graphql - draft', () => {
  let app: INestApplication;
  let preparedData: PrepareDataReturnType;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    preparedData = await prepareData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('renameTable', async () => {
    const result = await graphqlQuery({
      query: gql`
        mutation login($data: RenameTableInput!) {
          renameTable(data: $data) {
            previousVersionTableId
            table {
              id
            }
          }
        }
      `,
      variables: {
        data: {
          revisionId: preparedData.project.draftRevisionId,
          tableId: preparedData.project.tableId,
          nextTableId: 'nextId',
        },
      },
      app,
      token: preparedData.owner.token,
    });

    expect(result.renameTable.previousVersionTableId).toBe(
      preparedData.project.draftTableVersionId,
    );
    expect(result.renameTable.table.id).toBe('nextId');
  });
});
