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

// Four related REST-only readonly endpoints; tested as one spec since
// they share shape and auth contract.
const makeOp = (id: string, path: string) =>
  operation<{ revisionId: string; tableId: string }>({
    id,
    rest: {
      method: 'get',
      url: ({ revisionId, tableId }) =>
        `/api/revision/${revisionId}/tables/${tableId}/${path}`,
      query: () => ({ first: 10 }),
    },
  });

const endpoints = {
  countForeignKeysBy: makeOp(
    'table.countForeignKeysBy',
    'count-foreign-keys-by',
  ),
  foreignKeysBy: makeOp('table.foreignKeysBy', 'foreign-keys-by'),
  countForeignKeysTo: makeOp(
    'table.countForeignKeysTo',
    'count-foreign-keys-to',
  ),
  foreignKeysTo: makeOp('table.foreignKeysTo', 'foreign-keys-to'),
};

describe('table foreign-keys auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  for (const [label, op] of Object.entries(endpoints)) {
    describe(label, () => {
      runAuthMatrix({
        op,
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
  }
});
