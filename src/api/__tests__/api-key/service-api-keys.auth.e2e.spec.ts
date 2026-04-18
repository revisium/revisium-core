import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
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

describe('serviceApiKeys auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: serviceApiKeys,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: { organizationId: fresh.fixture.project.organizationId },
    }),
  });
});
