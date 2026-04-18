import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
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

// GraphQL-only endpoint list (REST goes through revision/:r/endpoints).
const projectEndpoints = operation<{
  organizationId: string;
  projectName: string;
}>({
  id: 'project.endpoints',
  gql: {
    query: gql`
      query projectEndpoints($data: GetProjectEndpointsInput!) {
        projectEndpoints(data: $data) {
          totalCount
        }
      }
    `,
    variables: ({ organizationId, projectName }) => ({
      data: { organizationId, projectName, first: 10 },
    }),
  },
});

describe('project endpoints (GQL) auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: projectEndpoints,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        },
      };
    },
  });
});
