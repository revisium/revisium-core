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

const tableViews = operation<{ revisionId: string; tableId: string }>({
  id: 'views.tableViews',
  gql: {
    query: gql`
      query tableViews($data: GetTableViewsInput!) {
        tableViews(data: $data) {
          version
          defaultViewId
        }
      }
    `,
    variables: ({ revisionId, tableId }) => ({
      data: { revisionId, tableId },
    }),
  },
});

describe('table views (readonly) auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: tableViews,
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
