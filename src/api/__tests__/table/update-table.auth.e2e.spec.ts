import { gql } from 'src/testing/utils/gql';
import { operation, runAuthMatrix } from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface UpdateTableParams {
  revisionId: string;
  tableId: string;
  patches: unknown[];
}

const updateTable = operation<UpdateTableParams>({
  id: 'table.update',
  rest: {
    method: 'patch',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}`,
    body: ({ patches }) => ({ patches }),
  },
  gql: {
    query: gql`
      mutation updateTable($data: UpdateTableInput!) {
        updateTable(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('update table auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: updateTable,
    cases: [{ name: 'owner', role: 'owner', expected: 'allowed' }],
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        patches: [
          {
            op: 'replace',
            path: '/properties/ver',
            value: { type: 'number', default: 0 },
          },
        ],
      },
    }),
  });
});
