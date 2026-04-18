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

const makeOp = (id: string, path: string) =>
  operation<{
    revisionId: string;
    tableId: string;
    rowId: string;
    fkTableId: string;
  }>({
    id,
    rest: {
      method: 'get',
      url: ({ revisionId, tableId, rowId }) =>
        `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/${path}`,
      query: ({ fkTableId }) => ({ first: 10, foreignKeyTableId: fkTableId }),
    },
  });

const ops = {
  countForeignKeysBy: makeOp('row.countForeignKeysBy', 'count-foreign-keys-by'),
  foreignKeysBy: makeOp('row.foreignKeysBy', 'foreign-keys-by'),
  countForeignKeysTo: makeOp('row.countForeignKeysTo', 'count-foreign-keys-to'),
  foreignKeysTo: makeOp('row.foreignKeysTo', 'foreign-keys-to'),
};

describe('row foreign-keys auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  for (const [label, op] of Object.entries(ops)) {
    describe(label, () => {
      runAuthMatrix({
        op,
        cases: PROJECT_VISIBILITY_MATRIX,
        build: (c) => {
          const fixture = projects[c.project];
          const fkTableId =
            fixture.project.linkedTable?.tableId ?? fixture.project.tableId;
          return {
            fixture,
            params: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowId: fixture.project.rowId,
              fkTableId,
            },
          };
        },
      });
    });
  }
});
