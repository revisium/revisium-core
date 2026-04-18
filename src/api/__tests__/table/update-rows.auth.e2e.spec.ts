import { gql } from 'src/testing/utils/gql';
import { operation, runAuthMatrix } from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const updateRows = operation<{
  revisionId: string;
  tableId: string;
  rows: Array<{ rowId: string; data: object }>;
}>({
  id: 'table.updateRows',
  rest: {
    method: 'put',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/update-rows`,
    body: ({ rows }) => ({ rows }),
  },
  gql: {
    query: gql`
      mutation updateRows($data: UpdateRowsInput!) {
        updateRows(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('update rows (bulk) auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: updateRows,
    cases: [{ name: 'owner', role: 'owner', expected: 'allowed' }],
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rows: [{ rowId: fresh.fixture.project.rowId, data: { ver: 2 } }],
      },
    }),
  });
});
