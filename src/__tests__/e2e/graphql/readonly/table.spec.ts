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

describe('graphql - table (readonly)', () => {
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

  describe('table query', () => {
    const getQuery = (revisionId: string, tableId: string) => ({
      query: gql`
        query table($data: GetTableInput!) {
          table(data: $data) {
            id
            versionId
            createdAt
            readonly
          }
        }
      `,
      variables: {
        data: { revisionId, tableId },
      },
    });

    it('owner can get table', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
      });

      expect(result.table.id).toBe(fixture.project.tableId);
    });

    it('cross-owner cannot get table from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot get table from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
        },
        /You are not allowed to read on Project/,
      );
    });

    describe('public project', () => {
      it('unauthenticated can get table from public project', async () => {
        const result = await gqlQuery({
          app,
          ...getQuery(
            publicFixture.project.draftRevisionId,
            publicFixture.project.tableId,
          ),
        });

        expect(result.table.id).toBe(publicFixture.project.tableId);
      });
    });
  });

  describe('tables query', () => {
    const getQuery = (revisionId: string) => ({
      query: gql`
        query tables($data: GetTablesInput!) {
          tables(data: $data) {
            totalCount
            edges {
              node {
                id
              }
            }
          }
        }
      `,
      variables: {
        data: { revisionId, first: 10 },
      },
    });

    it('owner can get tables', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(fixture.project.draftRevisionId),
      });

      expect(result.tables.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('cross-owner cannot get tables from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(fixture.project.draftRevisionId),
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('table with @ResolveField', () => {
    describe('rows field', () => {
      const getQuery = (revisionId: string, tableId: string) => ({
        query: gql`
          query table($data: GetTableInput!, $rowsData: GetTableRowsInput!) {
            table(data: $data) {
              id
              rows(data: $rowsData) {
                totalCount
                edges {
                  node {
                    id
                    versionId
                  }
                }
              }
            }
          }
        `,
        variables: {
          data: { revisionId, tableId },
          rowsData: { first: 10 },
        },
      });

      it('resolves rows field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
        });

        expect(result.table.rows).toBeDefined();
        expect(result.table.rows.totalCount).toBeGreaterThanOrEqual(1);
      });
    });

    describe('schema field', () => {
      const getQuery = (revisionId: string, tableId: string) => ({
        query: gql`
          query table($data: GetTableInput!) {
            table(data: $data) {
              id
              schema
            }
          }
        `,
        variables: {
          data: { revisionId, tableId },
        },
      });

      it('resolves schema field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
        });

        expect(result.table).toHaveProperty('schema');
      });
    });

    describe('count field', () => {
      const getQuery = (revisionId: string, tableId: string) => ({
        query: gql`
          query table($data: GetTableInput!) {
            table(data: $data) {
              id
              count
            }
          }
        `,
        variables: {
          data: { revisionId, tableId },
        },
      });

      it('resolves count field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId, fixture.project.tableId),
        });

        expect(result.table.count).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
