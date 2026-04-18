import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const meProjects = operation<Record<string, never>>({
  id: 'user.meProjects',
  gql: {
    query: gql`
      query meProjects($data: GetMeProjectsInput!) {
        meProjects(data: $data) {
          totalCount
        }
      }
    `,
    variables: () => ({ data: { first: 10 } }),
  },
});

// meProjects — any authenticated user gets their own list; anon unauthorized.
const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'allowed' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('meProjects auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: meProjects,
    cases,
    build: () => ({ fixture: fresh.fixture, params: {} }),
  });
});
