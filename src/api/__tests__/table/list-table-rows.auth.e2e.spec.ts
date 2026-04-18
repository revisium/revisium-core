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

// REST lists rows via POST body; GQL exposes it as a Query with RowsInput.
const listTableRows = operation<{ revisionId: string; tableId: string }>({
  id: 'table.listRows',
  rest: {
    method: 'post',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows`,
    body: () => ({ first: 10 }),
  },
  gql: {
    query: gql`
      query rows($data: GetRowsInput!) {
        rows(data: $data) {
          totalCount
        }
      }
    `,
    variables: ({ revisionId, tableId }) => ({
      data: { revisionId, tableId, first: 10 },
    }),
  },
});

describe('list table rows auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: listTableRows,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        },
      };
    },
  });
});
