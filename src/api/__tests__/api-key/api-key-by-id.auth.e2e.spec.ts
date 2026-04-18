import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const apiKeyById = operation<{ id: string }>({
  id: 'apiKey.byId',
  gql: {
    query: gql`
      query apiKeyById($id: ID!) {
        apiKeyById(id: $id) {
          id
        }
      }
    `,
    variables: ({ id }) => ({ id }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner (non-existent)', role: 'owner', expected: 'not_found' },
  {
    name: 'cross-owner (non-existent)',
    role: 'crossOwner',
    expected: 'not_found',
  },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('apiKeyById auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: apiKeyById,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: { id: nanoid() },
    }),
  });
});
