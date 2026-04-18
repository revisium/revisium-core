import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

const deleteRow = operation<{
  revisionId: string;
  tableId: string;
  rowId: string;
}>({
  id: 'row.delete',
  rest: {
    method: 'delete',
    url: ({ revisionId, tableId, rowId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
  },
  gql: {
    query: gql`
      mutation deleteRow($data: DeleteRowInput!) {
        deleteRow(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('delete row auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: deleteRow,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        rowId: shared.fixture.project.rowId,
      },
    }),
  });
});
