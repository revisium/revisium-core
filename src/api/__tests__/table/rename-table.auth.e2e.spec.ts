import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

const renameTable = operation<{
  revisionId: string;
  tableId: string;
  nextTableId: string;
}>({
  id: 'table.rename',
  rest: {
    method: 'patch',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rename`,
    body: ({ nextTableId }) => ({ nextTableId }),
  },
  gql: {
    query: gql`
      mutation renameTable($data: RenameTableInput!) {
        renameTable(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('rename table auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: renameTable,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        nextTableId: `renamed-${nanoid()}`,
      },
    }),
  });
});
