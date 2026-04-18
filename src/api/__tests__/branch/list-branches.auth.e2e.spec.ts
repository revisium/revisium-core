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

const listBranches = operation<{
  organizationId: string;
  projectName: string;
}>({
  id: 'project.branches',
  rest: {
    method: 'get',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/branches`,
    query: () => ({ first: 10 }),
  },
  gql: {
    query: gql`
      query branches($data: GetBranchesInput!) {
        branches(data: $data) {
          totalCount
        }
      }
    `,
    variables: ({ organizationId, projectName }) => ({
      data: { organizationId, projectName, first: 10 },
    }),
  },
});

describe('list branches auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: listBranches,
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
