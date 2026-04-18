import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface UsersOrgParams {
  organizationId: string;
}

const usersOrganization = operation<UsersOrgParams>({
  id: 'organization.usersOrganization',
  rest: {
    method: 'get',
    url: ({ organizationId }) => `/api/organization/${organizationId}/users`,
    query: () => ({ first: 10 }),
  },
  gql: {
    query: gql`
      query usersOrganization($data: GetUsersOrganizationInput!) {
        usersOrganization(data: $data) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
      }
    `,
    variables: ({ organizationId }) => ({
      data: { organizationId, first: 10 },
    }),
  },
});

// User listing is PII — only org members can read.
const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('users-organization auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: usersOrganization,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: { organizationId: fresh.fixture.project.organizationId },
      assert: {
        gql: (data) => {
          const r = data as { usersOrganization: { totalCount: number } };
          expect(r.usersOrganization.totalCount).toBeGreaterThanOrEqual(1);
        },
        rest: (body) => {
          const r = body as { totalCount: number };
          expect(r.totalCount).toBeGreaterThanOrEqual(1);
        },
      },
    }),
  });
});
