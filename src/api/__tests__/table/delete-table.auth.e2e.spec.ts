import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: deleteTable,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
      },
    }),
  });
});
