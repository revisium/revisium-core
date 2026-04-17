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

const rowQuery = gql`
  query row($data: GetRowInput!) {
    row(data: $data) {
      id
      versionId
      createdAt
      updatedAt
      readonly
    }
  }
`;

const rowsQuery = gql`
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
`;

const rowVars = (f: PrepareDataReturnType) => ({
  data: {
    revisionId: f.project.draftRevisionId,
    tableId: f.project.tableId,
    rowId: f.project.rowId,
  },
});

const rowsVars = (f: PrepareDataReturnType) => ({
  data: {
    revisionId: f.project.draftRevisionId,
    tableId: f.project.tableId,
    first: 10,
  },
});

describe('graphql - row (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;
  let fixture: PrepareDataReturnType;
  let publicFixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
    fixture = await getReadonlyFixture(app);
    publicFixture = await getPublicProjectFixture(app);
    if (!fixture.project.linkedTable) {
      throw new Error(
        'Readonly fixture missing linkedTable; row foreign-key resolver tests depend on it.',
      );
    }
  });

  describe('row query', () => {
    describeAuthMatrix(
      'private project access',
      PRIVATE_RESOURCE_MATRIX,
      async ({ role, outcome }) => {
        const actor = kit.roleFor(fixture, role);
        const vars = rowVars(fixture);
        if (outcome === 'ok') {
          const result = await actor.expectOk<{ row: { id: string } }>(
            rowQuery,
            vars,
          );
          expect(result.row.id).toBe(fixture.project.rowId);
        } else {
          await actor.expectForbidden(rowQuery, vars);
        }
      },
    );

    it('anon can read row from public project', async () => {
      const result = await kit
        .anon()
        .expectOk<{ row: { id: string } }>(rowQuery, rowVars(publicFixture));
      expect(result.row.id).toBe(publicFixture.project.rowId);
    });
  });

  describe('rows query', () => {
    it('owner can list rows', async () => {
      const result = await kit.owner(fixture).expectOk<{
        rows: { totalCount: number };
      }>(rowsQuery, rowsVars(fixture));
      expect(result.rows.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('cross-owner is forbidden from listing rows', async () => {
      await kit
        .crossOwner(fixture)
        .expectForbidden(rowsQuery, rowsVars(fixture));
    });
  });

  describe('@ResolveField', () => {
    it('resolves data', async () => {
      const query = gql`
        query row($data: GetRowInput!) {
          row(data: $data) {
            id
            data
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        row: { data: unknown };
      }>(query, rowVars(fixture));
      expect(result.row).toHaveProperty('data');
    });

    it('resolves countForeignKeysTo', async () => {
      const query = gql`
        query row($data: GetRowInput!) {
          row(data: $data) {
            id
            countForeignKeysTo
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        row: { countForeignKeysTo: number };
      }>(query, rowVars(fixture));
      expect(typeof result.row.countForeignKeysTo).toBe('number');
    });

    it('resolves rowForeignKeysBy', async () => {
      const query = gql`
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
      `;
      const result = await kit.owner(fixture).expectOk<{
        row: { rowForeignKeysBy: { totalCount: number } };
      }>(query, {
        ...rowVars(fixture),
        by: {
          first: 10,
          foreignKeyTableId: fixture.project.linkedTable!.tableId,
        },
      });
      expect(result.row.rowForeignKeysBy.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('resolves rowForeignKeysTo', async () => {
      const query = gql`
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
      `;
      const result = await kit.owner(fixture).expectOk<{
        row: { rowForeignKeysTo: { totalCount: number } };
      }>(query, {
        ...rowVars(fixture),
        to: {
          first: 10,
          foreignKeyTableId: fixture.project.linkedTable!.tableId,
        },
      });
      expect(result.row.rowForeignKeysTo.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRowCountForeignKeysTo query', () => {
    const query = gql`
      query getRowCountForeignKeysTo($data: GetRowCountForeignKeysByInput!) {
        getRowCountForeignKeysTo(data: $data)
      }
    `;

    it('owner can get count', async () => {
      const result = await kit.owner(fixture).expectOk<{
        getRowCountForeignKeysTo: number;
      }>(query, rowVars(fixture));
      expect(typeof result.getRowCountForeignKeysTo).toBe('number');
    });

    it('cross-owner is forbidden', async () => {
      await kit.crossOwner(fixture).expectForbidden(query, rowVars(fixture));
    });
  });
});
