import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

type Patch = { op: 'replace'; path: string; value: unknown };
type Params = {
  revisionId: string;
  tableId: string;
  rowId: string;
  patches: Patch[];
};

const patchRow = operation<Params>({
  id: 'row.patch',
  rest: {
    method: 'patch',
    url: ({ revisionId, tableId, rowId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
    body: ({ patches }) => ({ patches }),
  },
  gql: {
    query: gql`
      mutation patchRow($data: PatchRowInput!) {
        patchRow(data: $data) {
          row {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('patch row auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: patchRow,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        rowId: shared.fixture.project.rowId,
        patches: [{ op: 'replace' as const, path: 'ver', value: 7 }],
      },
    }),
  });
});
