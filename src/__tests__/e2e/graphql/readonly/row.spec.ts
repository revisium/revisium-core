import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  getPublicProjectFixture,
  gqlQuery,
  gqlQueryExpectError,
  type PrepareDataReturnType,
} from 'src/__tests__/e2e/shared';

describe('graphql - row (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;
  let publicFixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
    publicFixture = await getPublicProjectFixture(app);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('row query', () => {
    const getQuery = (revisionId: string, tableId: string, rowId: string) => ({
      query: gql`
        query row($data: GetRowInput!) {
          row(data: $data) {
            id
            versionId
            createdAt
            updatedAt
            readonly
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, rowId },
      },
    });

    it('owner can get row', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          fixture.project.rowId,
        ),
      });

      expect(result.row.id).toBe(fixture.project.rowId);
    });

    it('cross-owner cannot get row from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot get row from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    describe('public project', () => {
      it('unauthenticated can get row from public project', async () => {
        const result = await gqlQuery({
          app,
          ...getQuery(
            publicFixture.project.draftRevisionId,
            publicFixture.project.tableId,
            publicFixture.project.rowId,
          ),
        });

        expect(result.row.id).toBe(publicFixture.project.rowId);
      });
    });
  });

  describe('rows query', () => {
    const getQuery = (revisionId: string, tableId: string) => ({
      query: gql`
        query rows($data: GetRowsInput!) {
          rows(data: $data) {
            totalCount
            edges {
              node {
                id
                versionId
              }
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, first: 10 },
      },
    });

    it('owner can get rows', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
      });

      expect(result.rows.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('cross-owner cannot get rows from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('row with @ResolveField', () => {
    describe('data field', () => {
      const getQuery = (
        revisionId: string,
        tableId: string,
        rowId: string,
      ) => ({
        query: gql`
          query row($data: GetRowInput!) {
            row(data: $data) {
              id
              data
            }
          }
        `,
        variables: {
          data: { revisionId, tableId, rowId },
        },
      });

      it('resolves data field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });

        expect(result.row).toHaveProperty('data');
      });
    });

    describe('countForeignKeysTo field', () => {
      const getQuery = (
        revisionId: string,
        tableId: string,
        rowId: string,
      ) => ({
        query: gql`
          query row($data: GetRowInput!) {
            row(data: $data) {
              id
              countForeignKeysTo
            }
          }
        `,
        variables: {
          data: { revisionId, tableId, rowId },
        },
      });

      it('resolves countForeignKeysTo field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });

        expect(result.row).toHaveProperty('countForeignKeysTo');
        expect(typeof result.row.countForeignKeysTo).toBe('number');
      });
    });

    describe('rowForeignKeysBy field', () => {
      const getQuery = (
        revisionId: string,
        tableId: string,
        rowId: string,
        foreignKeyTableId: string,
      ) => ({
        query: gql`
          query row($data: GetRowInput!, $by: GetRowForeignKeysInput!) {
            row(data: $data) {
              id
              rowForeignKeysBy(data: $by) {
                totalCount
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: {
          data: { revisionId, tableId, rowId },
          by: { first: 10, foreignKeyTableId },
        },
      });

      it('resolves rowForeignKeysBy field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            fixture.project.linkedTable?.tableId ?? '',
          ),
        });

        expect(result.row.rowForeignKeysBy).toBeDefined();
        expect(result.row.rowForeignKeysBy.totalCount).toBeGreaterThanOrEqual(
          0,
        );
      });
    });

    describe('rowForeignKeysTo field', () => {
      const getQuery = (
        revisionId: string,
        tableId: string,
        rowId: string,
        foreignKeyTableId: string,
      ) => ({
        query: gql`
          query row($data: GetRowInput!, $to: GetRowForeignKeysInput!) {
            row(data: $data) {
              id
              rowForeignKeysTo(data: $to) {
                totalCount
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: {
          data: { revisionId, tableId, rowId },
          to: { first: 10, foreignKeyTableId },
        },
      });

      it('resolves rowForeignKeysTo field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            fixture.project.linkedTable?.tableId ?? '',
          ),
        });

        expect(result.row.rowForeignKeysTo).toBeDefined();
        expect(result.row.rowForeignKeysTo.totalCount).toBeGreaterThanOrEqual(
          0,
        );
      });
    });
  });

  describe('getRowCountForeignKeysTo query', () => {
    const getQuery = (revisionId: string, tableId: string, rowId: string) => ({
      query: gql`
        query getRowCountForeignKeysTo($data: GetRowCountForeignKeysByInput!) {
          getRowCountForeignKeysTo(data: $data)
        }
      `,
      variables: {
        data: { revisionId, tableId, rowId },
      },
    });

    it('owner can get count', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          fixture.project.rowId,
        ),
      });

      expect(typeof result.getRowCountForeignKeysTo).toBe('number');
    });

    it('cross-owner cannot get count from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });
  });
});
