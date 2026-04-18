import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const serviceApiKeys = operation<{ organizationId: string }>({
  id: 'apiKey.serviceKeys',
  gql: {
    query: gql`
      query serviceApiKeys($organizationId: String!) {
        serviceApiKeys(organizationId: $organizationId) {
          id
        }
      }
    `,
    variables: ({ organizationId }) => ({ organizationId }),
  },
});

// serviceApiKeys scopes by organization membership role:
// organizationOwner can list. Outsiders (cross-owner) are forbidden.
// Anon is gated at auth. Finer-grained intra-org roles (developer allowed,
// reader forbidden) require a projectMember / orgMember actor factory;
// tracked as follow-up.
const cases: AuthMatrixCaseBase[] = [
  { name: 'organization-owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-org outsider', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('serviceApiKeys auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: serviceApiKeys,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: { organizationId: fresh.fixture.project.organizationId },
    }),
  });
});
