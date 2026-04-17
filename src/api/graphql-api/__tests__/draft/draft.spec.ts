import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { graphqlQuery, graphqlQueryError } from 'src/testing/utils/queryTest';
import { createFreshTestApp } from 'src/testing/e2e';

describe('graphql - draft', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
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

    it('should throw error if IDs are the same', async () => {
      return graphqlQueryError({
        ...getRenameQuery(preparedData.project.tableId),
        app,
        token: preparedData.owner.token,
        error: /New ID must be different from current/,
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

  describe('applyMigrations', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can perform mutation', async () => {
      const migrationId = new Date().toISOString();
      const newTableId = `new-table-${Date.now()}`;

      const result = await graphqlQuery({
        ...getApplyMigrationsQuery([
          {
            changeType: 'init',
            id: migrationId,
            tableId: newTableId,
            hash: 'test-hash',
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', default: '' },
              },
              additionalProperties: false,
            },
          },
        ]),
        app,
        token: preparedData.owner.token,
      });

      expect(result.applyMigrations).toHaveLength(1);
      expect(result.applyMigrations[0]).toEqual({
        id: migrationId,
        status: 'applied',
        error: null,
      });
    });

    it('another owner cannot perform mutation (private project)', async () => {
      return graphqlQueryError({
        ...getApplyMigrationsQuery([
          {
            changeType: 'remove',
            id: new Date().toISOString(),
            tableId: preparedData.project.tableId,
          },
        ]),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on Project/,
      });
    });

    it('should throw error without authentication', async () => {
      return graphqlQueryError({
        ...getApplyMigrationsQuery([
          {
            changeType: 'remove',
            id: new Date().toISOString(),
            tableId: preparedData.project.tableId,
          },
        ]),
        app,
        token: undefined,
        error: /Unauthorized/,
      });
    });

    function getApplyMigrationsQuery(migrations: object[]) {
      return {
        query: gql`
          mutation applyMigrations($data: ApplyMigrationsInput!) {
            applyMigrations(data: $data) {
              id
              status
              error
            }
          }
        `,
        variables: {
          data: {
            revisionId: preparedData.project.draftRevisionId,
            migrations,
          },
        },
      };
    }
  });
});
