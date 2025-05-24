import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { graphqlQuery, graphqlQueryError } from 'src/__tests__/utils/queryTest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

describe('graphql - draft', () => {
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

  describe('renameTable', () => {
    const nextTableId = 'nextTableId';
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can perform mutation', async () => {
      const result = await graphqlQuery({
        ...getRenameQuery(nextTableId),
        app,
        token: preparedData.owner.token,
      });

      expect(result.renameTable.previousVersionTableId).toBe(
        preparedData.project.draftTableVersionId,
      );
      expect(result.renameTable.table.id).toBe(nextTableId);
    });

    it('another owner cannot perform mutation', async () => {
      return graphqlQueryError({
        ...getRenameQuery(nextTableId),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on Project/,
      });
    });

    it('should throw error if table already exists', async () => {
      return graphqlQueryError({
        ...getRenameQuery(preparedData.project.tableId),
        app,
        token: preparedData.owner.token,
        error: /A table with this name already exists in the revision/,
      });
    });

    function getRenameQuery(nextTableId: string) {
      return {
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
            nextTableId,
          },
        },
      };
    }
  });
});
