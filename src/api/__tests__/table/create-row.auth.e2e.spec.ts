import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createRow,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        rowId: `r-${nanoid()}`,
        data: { ver: 1 },
      },
    }),
  });
});
