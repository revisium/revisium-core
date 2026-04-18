import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const deleteRows = operation<{
  revisionId: string;
  tableId: string;
  rowIds: string[];
}>({
  id: 'table.deleteRows',
  rest: {
    method: 'delete',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows`,
    body: ({ rowIds }) => ({ rowIds }),
  },
  gql: {
    query: gql`
      mutation deleteRows($data: DeleteRowsInput!) {
        deleteRows(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('delete rows (bulk) auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: deleteRows,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rowIds: [fresh.fixture.project.rowId],
      },
    }),
  });
});
