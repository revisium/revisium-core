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

const rowChanges = operation<{ revisionId: string; tableId: string }>({
  id: 'revision.rowChanges',
  rest: {
    method: 'get',
    url: ({ revisionId }) => `/api/revision/${revisionId}/row-changes`,
    query: ({ tableId }) => ({ first: 10, tableId }),
  },
  gql: {
    query: gql`
      query rowChanges($data: GetRowChangesInput!) {
        rowChanges(data: $data) {
          totalCount
        }
      }
    `,
    variables: ({ revisionId, tableId }) => ({
      data: { revisionId, first: 10, filters: { tableId } },
    }),
  },
});

describe('row changes auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: rowChanges,
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
