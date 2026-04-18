import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const myApiKeys = operation<Record<string, never>>({
  id: 'apiKey.myKeys',
  gql: {
    query: gql`
      query myApiKeys {
        myApiKeys {
          id
        }
      }
    `,
    variables: () => ({}),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'allowed' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('myApiKeys auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: myApiKeys,
    cases,
    build: () => ({ fixture: fresh.fixture, params: {} }),
  });
});
