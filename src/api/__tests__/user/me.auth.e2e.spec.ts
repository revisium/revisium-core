import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

// `me` returns the authenticated user. No params.
const me = operation<Record<string, never>>({
  id: 'user.me',
  rest: {
    method: 'get',
    url: () => `/api/user/me`,
  },
  gql: {
    query: gql`
      query me {
        me {
          id
          username
        }
      }
    `,
    variables: () => ({}),
  },
});

// Any authenticated user can fetch their own record.
// Anon → unauthorized. There is no "cross-owner" distinction — every user
// sees themselves. `crossOwner` token sees themselves as well (expected: allowed).
const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'allowed' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('me auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: me,
    cases,
    build: (c) => ({
      fixture: fresh.fixture,
      params: {},
      assert: {
        gql: (data) => {
          const r = data as { me: { id: string } };
          const expectedId =
            c.role === 'owner'
              ? fresh.fixture.owner.user.id
              : fresh.fixture.anotherOwner.user.id;
          expect(r.me.id).toBe(expectedId);
        },
        rest: (body) => {
          const r = body as { id: string };
          const expectedId =
            c.role === 'owner'
              ? fresh.fixture.owner.user.id
              : fresh.fixture.anotherOwner.user.id;
          expect(r.id).toBe(expectedId);
        },
      },
    }),
  });
});
