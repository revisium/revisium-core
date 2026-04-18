import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

type Patch = { op: 'replace'; path: string; value: unknown };
type Params = {
  revisionId: string;
  tableId: string;
  rows: { rowId: string; patches: Patch[] }[];
};

const patchRows = operation<Params>({
  id: 'table.patchRows',
  rest: {
    method: 'patch',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/patch-rows`,
    body: ({ rows }) => ({ rows }),
  },
  gql: {
    query: gql`
      mutation patchRows($data: PatchRowsInput!) {
        patchRows(data: $data) {
          rows {
            id
          }
        }
      }
    `,
    variables: ({ revisionId, tableId, rows }) => ({
      data: { revisionId, tableId, rows },
    }),
  },
});

describe('patch rows auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: patchRows,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rows: [
          {
            rowId: fresh.fixture.project.rowId,
            patches: [{ op: 'replace' as const, path: 'ver', value: 13 }],
          },
        ],
      },
    }),
  });
});
