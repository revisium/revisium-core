import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

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
  const shared = usingSharedProject();

  runAuthMatrix({
    op: deleteRows,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        rowIds: [shared.fixture.project.rowId],
      },
    }),
  });
});
