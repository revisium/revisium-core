import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  describeAuthMatrix,
  getTestApp,
  getReadonlyFixture,
  getPublicProjectFixture,
  gqlKit,
  PRIVATE_RESOURCE_MATRIX,
  type GqlKit,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

const tableQuery = gql`
  query table($data: GetTableInput!) {
    table(data: $data) {
      id
      versionId
      createdAt
      readonly
    }
  }
`;

const tablesQuery = gql`
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
`;

const tableVars = (revisionId: string, tableId: string) => ({
  data: { revisionId, tableId },
});

const tablesVars = (revisionId: string) => ({
  data: { revisionId, first: 10 },
});

describe('graphql - table (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;
  let fixture: PrepareDataReturnType;
  let publicFixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
    fixture = await getReadonlyFixture(app);
    publicFixture = await getPublicProjectFixture(app);
  });

  describe('table query', () => {
    describeAuthMatrix(
      'private project access',
      PRIVATE_RESOURCE_MATRIX,
      async ({ role, outcome }) => {
        const actor = kit.roleFor(fixture, role);
        const vars = tableVars(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
        );
        if (outcome === 'ok') {
          const result = await actor.expectOk<{ table: { id: string } }>(
            tableQuery,
            vars,
          );
          expect(result.table.id).toBe(fixture.project.tableId);
        } else {
          await actor.expectForbidden(tableQuery, vars);
        }
      },
    );

    it('anon can read table from public project', async () => {
      const result = await kit.anon().expectOk<{
        table: { id: string };
      }>(tableQuery, tableVars(publicFixture.project.draftRevisionId, publicFixture.project.tableId));
      expect(result.table.id).toBe(publicFixture.project.tableId);
    });
  });

  describe('tables query', () => {
    it('owner can list tables', async () => {
      const result = await kit.owner(fixture).expectOk<{
        tables: { totalCount: number };
      }>(tablesQuery, tablesVars(fixture.project.draftRevisionId));
      expect(result.tables.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('cross-owner is forbidden from listing tables', async () => {
      await kit
        .crossOwner(fixture)
        .expectForbidden(
          tablesQuery,
          tablesVars(fixture.project.draftRevisionId),
        );
    });
  });

  describe('@ResolveField', () => {
    it('resolves rows', async () => {
      const query = gql`
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
      `;
      const result = await kit.owner(fixture).expectOk<{
        table: { rows: { totalCount: number } };
      }>(query, {
        ...tableVars(fixture.project.draftRevisionId, fixture.project.tableId),
        rowsData: { first: 10 },
      });
      expect(result.table.rows.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('resolves schema', async () => {
      const query = gql`
        query table($data: GetTableInput!) {
          table(data: $data) {
            id
            schema
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        table: { schema: unknown };
      }>(query, tableVars(fixture.project.draftRevisionId, fixture.project.tableId));
      expect(result.table).toHaveProperty('schema');
    });

    it('resolves count', async () => {
      const query = gql`
        query table($data: GetTableInput!) {
          table(data: $data) {
            id
            count
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        table: { count: number };
      }>(query, tableVars(fixture.project.draftRevisionId, fixture.project.tableId));
      expect(result.table.count).toBeGreaterThanOrEqual(1);
    });
  });
});
