import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: renameRow,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rowId: fresh.fixture.project.rowId,
        nextRowId: `renamed-${nanoid()}`,
      },
    }),
  });
});
