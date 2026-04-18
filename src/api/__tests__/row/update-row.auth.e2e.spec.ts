import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const updateRow = operation<{
  revisionId: string;
  tableId: string;
  rowId: string;
  data: object;
}>({
  id: 'row.update',
  rest: {
    method: 'put',
    url: ({ revisionId, tableId, rowId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
    body: ({ data }) => ({ data }),
  },
  gql: {
    query: gql`
      mutation updateRow($data: UpdateRowInput!) {
        updateRow(data: $data) {
          row {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('update row auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: updateRow,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rowId: fresh.fixture.project.rowId,
        data: { ver: 2 },
      },
    }),
  });
});
