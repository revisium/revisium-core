import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import { operation, runAuthMatrix } from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const createRows = operation<{
  revisionId: string;
  tableId: string;
  rows: Array<{ rowId: string; data: object }>;
}>({
  id: 'table.createRows',
  rest: {
    method: 'post',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/create-rows`,
    body: ({ rows }) => ({ rows }),
  },
  gql: {
    query: gql`
      mutation createRows($data: CreateRowsInput!) {
        createRows(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('create rows (bulk) auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createRows,
    cases: [{ name: 'owner', role: 'owner', expected: 'allowed' }],
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rows: [{ rowId: `r-${nanoid()}`, data: { ver: 1 } }],
      },
    }),
  });
});
