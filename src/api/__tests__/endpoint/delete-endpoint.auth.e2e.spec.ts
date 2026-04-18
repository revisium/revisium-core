import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const deleteEndpoint = operation<{ endpointId: string }>({
  id: 'endpoint.delete',
  rest: {
    method: 'delete',
    url: ({ endpointId }) => `/api/endpoints/${endpointId}`,
  },
  gql: {
    query: gql`
      mutation deleteEndpoint($data: DeleteEndpointInput!) {
        deleteEndpoint(data: $data)
      }
    `,
    variables: ({ endpointId }) => ({ data: { endpointId } }),
  },
});

describe('delete endpoint auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: deleteEndpoint,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: { endpointId: fresh.fixture.project.headEndpointId },
    }),
  });
});
