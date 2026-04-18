import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  PROJECT_VISIBILITY_MATRIX,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

type Params = {
  revisionId: string;
  tableId: string;
  rowId: string;
  fkTableId: string;
};

const deepTable = operation<Params>({
  id: 'table.deep',
  gql: {
    query: gql`
      query deepTable(
        $data: GetTableInput!
        $rowData: GetRowInput!
        $rowFk: GetRowForeignKeysInput!
      ) {
        table(data: $data) {
          id
          count
          schema
          countForeignKeysTo
          countForeignKeysBy
          foreignKeysTo(data: { first: 5 }) {
            totalCount
          }
          foreignKeysBy(data: { first: 5 }) {
            totalCount
          }
          views {
            version
            defaultViewId
          }
          rows(data: { first: 5 }) {
            totalCount
          }
        }
        row(data: $rowData) {
          id
          countForeignKeysTo
          rowForeignKeysBy(data: $rowFk) {
            totalCount
          }
          rowForeignKeysTo(data: $rowFk) {
            totalCount
          }
        }
      }
    `,
    variables: ({ revisionId, tableId, rowId, fkTableId }) => ({
      data: { revisionId, tableId },
      rowData: { revisionId, tableId, rowId },
      rowFk: { foreignKeyTableId: fkTableId, first: 5 },
    }),
  },
});

describe('table deep-query GraphQL resolvers', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: deepTable,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
          // No related table in the default fixture; the goal here is to
          // exercise the FK resolver's auth path + happy-path execution, not
          // cross-table FK resolution. Returns totalCount: 0, which is fine.
          fkTableId: fixture.project.tableId,
        },
      };
    },
  });
});
