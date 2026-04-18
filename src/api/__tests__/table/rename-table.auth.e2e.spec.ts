import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: renameTable,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        nextTableId: `renamed-${nanoid()}`,
      },
    }),
  });
});
