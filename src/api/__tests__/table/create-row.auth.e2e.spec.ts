import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

const createRow = operation<{
  revisionId: string;
  tableId: string;
  rowId: string;
  data: object;
}>({
  id: 'table.createRow',
  rest: {
    method: 'post',
    url: ({ revisionId, tableId }) =>
      `/api/revision/${revisionId}/tables/${tableId}/create-row`,
    body: ({ rowId, data }) => ({ rowId, data }),
  },
  gql: {
    query: gql`
      mutation createRow($data: CreateRowInput!) {
        createRow(data: $data) {
          row {
            id
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('create row auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: createRow,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.draftRevisionId,
        tableId: shared.fixture.project.tableId,
        rowId: `r-${nanoid()}`,
        data: { ver: 1 },
      },
    }),
  });
});
