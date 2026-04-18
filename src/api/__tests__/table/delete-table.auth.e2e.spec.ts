import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

const deleteTable = operation<{ revisionId: string; tableId: string }>({
  id: 'table.delete',
  rest: {
    method: 'delete',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}`,
  },
  gql: {
    query: gql`
      mutation deleteTable($data: DeleteTableInput!) {
        deleteTable(data: $data) {
          branch {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('delete table auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: deleteTable,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
      },
    }),
  });
});
