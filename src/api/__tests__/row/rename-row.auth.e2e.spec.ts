import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

const renameRow = operation<{
  revisionId: string;
  tableId: string;
  rowId: string;
  nextRowId: string;
}>({
  id: 'row.rename',
  rest: {
    method: 'patch',
    url: ({ revisionId, tableId, rowId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/rename`,
    body: ({ nextRowId }) => ({ nextRowId }),
  },
  gql: {
    query: gql`
      mutation renameRow($data: RenameRowInput!) {
        renameRow(data: $data) {
          row {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('rename row auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: renameRow,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        rowId: shared.fixture.project.rowId,
        nextRowId: `renamed-${nanoid()}`,
      },
    }),
  });
});
