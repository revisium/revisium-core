import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const searchUsers = operation<Record<string, never>>({
  id: 'user.searchUsers',
  gql: {
    query: gql`
      query searchUsers($data: SearchUsersInput!) {
        searchUsers(data: $data) {
          totalCount
        }
      }
    `,
    variables: () => ({ data: { search: 'user', first: 10 } }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'allowed' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('searchUsers auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: searchUsers,
    cases,
    build: () => ({ fixture: fresh.fixture, params: {} }),
  });
});
