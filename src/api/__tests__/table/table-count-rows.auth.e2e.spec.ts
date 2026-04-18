import { INestApplication } from '@nestjs/common';
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

const tableCountRows = operation<{ revisionId: string; tableId: string }>({
  id: 'table.countRows',
  rest: {
    method: 'get',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/count-rows`,
  },
});

describe('table count-rows auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: tableCountRows,
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
