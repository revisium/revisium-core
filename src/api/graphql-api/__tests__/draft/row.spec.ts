import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { graphqlQuery, graphqlQueryError } from 'src/__tests__/utils/queryTest';
import { OrderByField, OrderDataType } from 'src/api/graphql-api/row/inputs';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

describe('row', () => {
  describe('row', () => {
    it('owner can get row', async () => {
      const result = await graphqlQuery({
        ...getQuery(),
        app,
        token: preparedData.owner.token,
      });

      expect(result.row.id).toBe(preparedData.project.rowId);
      expect(result.row.rowForeignKeysBy.totalCount).toBe(1);
      expect(result.row.rowForeignKeysTo.totalCount).toBe(0);
    });

    it('another owner cannot perform mutation', async () => {
      return graphqlQueryError({
        ...getQuery(),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on Project/,
      });
    });

    function getQuery() {
      return {
        query: gql`
          query row(
            $data: GetRowInput!
            $by: GetRowForeignKeysInput!
            $to: GetRowForeignKeysInput!
          ) {
            row(data: $data) {
              id
              countForeignKeysTo
              rowForeignKeysBy(data: $by) {
                totalCount
              }
              rowForeignKeysTo(data: $to) {
                totalCount
              }
            }
          }
        `,
        variables: {
          data: {
            revisionId: preparedData.project.draftRevisionId,
            tableId: preparedData.project.tableId,
            rowId: preparedData.project.rowId,
          },
          to: {
            first: 1,
            foreignKeyTableId: preparedData.project.linkedTable?.tableId,
          },
          by: {
            first: 1,
            foreignKeyTableId: preparedData.project.linkedTable?.tableId,
          },
        },
      };
    }
  });

  describe('rows', () => {
    it('owner can get rows', async () => {
      const result = await graphqlQuery({
        ...getQuery(),
        app,
        token: preparedData.owner.token,
      });

      expect(result.rows.totalCount).toBe(1);
    });

    it('another owner cannot perform mutation', async () => {
      return graphqlQueryError({
        ...getQuery(),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on Project/,
      });
    });

    function getQuery() {
      return {
        query: gql`
          query rows($data: GetRowsInput!) {
            rows(data: $data) {
              totalCount
            }
          }
        `,
        variables: {
          data: {
            revisionId: preparedData.project.draftRevisionId,
            tableId: preparedData.project.tableId,
            first: 1,
            orderBy: [
              {
                field: OrderByField.data,
                direction: Prisma.SortOrder.desc,
                path: 'ver',
                type: OrderDataType.int,
              },
            ],
          },
        },
      };
    }
  });

  describe('getRowCountForeignKeysTo', () => {
    it('owner can get row', async () => {
      const result = await graphqlQuery({
        ...getQuery(),
        app,
        token: preparedData.owner.token,
      });

      expect(result.getRowCountForeignKeysTo).toBe(1);
    });

    it('another owner cannot perform mutation', async () => {
      return graphqlQueryError({
        ...getQuery(),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on Project/,
      });
    });

    function getQuery() {
      return {
        query: gql`
          query getRowCountForeignKeysTo(
            $data: GetRowCountForeignKeysByInput!
          ) {
            getRowCountForeignKeysTo(data: $data)
          }
        `,
        variables: {
          data: {
            revisionId: preparedData.project.draftRevisionId,
            tableId: preparedData.project.tableId,
            rowId: preparedData.project.rowId,
          },
        },
      };
    }
  });

  let app: INestApplication;

  let preparedData: PrepareDataReturnType;

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

  beforeAll(async () => {
    preparedData = await prepareData(app, { createLinkedTable: true });
  });
});
