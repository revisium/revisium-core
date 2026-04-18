import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface GetOrganizationParams {
  organizationId: string;
}

// GraphQL-only — REST has no plain GET /organization/:id endpoint.
const getOrganization = operation<GetOrganizationParams>({
  id: 'organization.get',
  gql: {
    query: gql`
      query organization($data: GetOrganizationInput!) {
        organization(data: $data) {
          id
        }
      }
    `,
    variables: ({ organizationId }) => ({ data: { organizationId } }),
  },
});

// Owner is in the org → allowed. Cross-owner is outside → forbidden.
// Anon short-circuits at authentication → unauthorized.
const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('get organization auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: getOrganization,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: { organizationId: fresh.fixture.project.organizationId },
      assert: {
        gql: (data) => {
          const r = data as { organization: { id: string } };
          expect(r.organization.id).toBe(fresh.fixture.project.organizationId);
        },
      },
    }),
  });
});
