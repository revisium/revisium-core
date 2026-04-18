import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

// Configuration is fully public — no guards at all. Everyone allowed.
const getConfiguration = operation<Record<string, never>>({
  id: 'configuration.get',
  rest: {
    method: 'get',
    url: () => `/api/configuration`,
  },
  gql: {
    query: gql`
      query configuration {
        configuration {
          availableEmailSignUp
        }
      }
    `,
    variables: () => ({}),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'allowed' },
  { name: 'anonymous', role: 'anonymous', expected: 'allowed' },
];

describe('configuration auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: getConfiguration,
    cases,
    build: () => ({ fixture: fresh.fixture, params: {} }),
  });
});
