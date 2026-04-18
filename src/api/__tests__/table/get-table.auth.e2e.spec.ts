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

const getTable = operation<{ revisionId: string; tableId: string }>({
  id: 'table.get',
  rest: {
    method: 'get',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}`,
  },
  gql: {
    query: gql`
      query table($data: GetTableInput!) {
        table(data: $data) {
          id
        }
      }
    `,
    variables: ({ revisionId, tableId }) => ({
      data: { revisionId, tableId },
    }),
  },
});

describe('get table auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: getTable,
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
