import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

// `createTable` is exposed by the draft resolver (GQL) and as REST POST
// on the revision endpoint.
const createTable = operation<{
  revisionId: string;
  tableId: string;
  schema: object;
}>({
  id: 'revision.createTable',
  rest: {
    method: 'post',
    url: ({ revisionId }) => `/api/revision/${revisionId}/tables`,
    body: ({ tableId, schema }) => ({ tableId, schema }),
  },
  gql: {
    query: gql`
      mutation createTable($data: CreateTableInput!) {
        createTable(data: $data) {
          table {
            id
          }
        }
      }
    `,
    variables: ({ revisionId, tableId, schema }) => ({
      data: { revisionId, tableId, schema },
    }),
  },
});

describe('create table auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createTable,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: `t-${nanoid()}`,
        schema: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false,
        },
      },
    }),
  });
});
