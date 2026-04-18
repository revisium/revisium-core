import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const revokeApiKey = operation<{ id: string }>({
  id: 'apiKey.revoke',
  gql: {
    query: gql`
      mutation revokeApiKey($id: ID!) {
        revokeApiKey(id: $id) {
          id
        }
      }
    `,
    variables: ({ id }) => ({ id }),
  },
});

// Revoking an API key you don't own → not_found (resource scoped to userId).
// Anon → unauthorized.
// No "owner can revoke their own" here — that's covered by the create
// spec + content tests in the dedicated api-key e2e suite.
const cases: AuthMatrixCaseBase[] = [
  { name: 'owner (non-existent key)', role: 'owner', expected: 'not_found' },
  {
    name: 'cross-owner (non-existent key)',
    role: 'crossOwner',
    expected: 'not_found',
  },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('revokeApiKey auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: revokeApiKey,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: { id: nanoid() },
    }),
  });
});
