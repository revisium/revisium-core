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

const getBranch = operation<{
  organizationId: string;
  projectName: string;
  branchName: string;
}>({
  id: 'branch.get',
  rest: {
    method: 'get',
    url: ({ organizationId, projectName, branchName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}`,
  },
  gql: {
    query: gql`
      query branch($data: GetBranchInput!) {
        branch(data: $data) {
          id
          name
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('get branch auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: getBranch,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        },
      };
    },
  });
});
