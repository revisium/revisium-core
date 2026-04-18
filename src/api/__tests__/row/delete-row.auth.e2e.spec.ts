import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: deleteRow,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rowId: fresh.fixture.project.rowId,
      },
    }),
  });
});
