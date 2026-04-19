import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

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
  const shared = usingSharedProject();

  runAuthMatrix({
    op: deleteEndpoint,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: { endpointId: shared.fixture.project.headEndpointId },
    }),
  });
});
