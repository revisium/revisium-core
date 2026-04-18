import { INestApplication } from '@nestjs/common';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  PROJECT_VISIBILITY_MATRIX,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

const endpointRelatives = operation<{ endpointId: string }>({
  id: 'endpoint.relatives',
  rest: {
    method: 'get',
    url: ({ endpointId }) => `/api/endpoints/${endpointId}/relatives`,
  },
});

describe('endpoint relatives auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: endpointRelatives,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: { endpointId: fixture.project.headEndpointId },
      };
    },
  });
});
