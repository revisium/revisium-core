import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

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
  const shared = usingSharedProject();

  runAuthMatrix({
    op: updateRow,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        rowId: shared.fixture.project.rowId,
        data: { ver: 2 },
      },
    }),
  });
});
