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

const getRow = operation<{
  revisionId: string;
  tableId: string;
  rowId: string;
}>({
  id: 'row.get',
  rest: {
    method: 'get',
    url: ({ revisionId, tableId, rowId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
  },
  gql: {
    query: gql`
      query row($data: GetRowInput!) {
        row(data: $data) {
          id
        }
      }
    `,
    variables: ({ revisionId, tableId, rowId }) => ({
      data: { revisionId, tableId, rowId },
    }),
  },
});

describe('get row auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: getRow,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        },
      };
    },
  });
});
