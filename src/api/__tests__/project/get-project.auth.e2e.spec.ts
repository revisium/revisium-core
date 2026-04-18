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

const getProject = operation<{
  organizationId: string;
  projectName: string;
}>({
  id: 'project.get',
  rest: {
    method: 'get',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}`,
  },
  gql: {
    query: gql`
      query project($data: GetProjectInput!) {
        project(data: $data) {
          id
          name
          isPublic
          organizationId
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('get project auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: getProject,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        },
        assert: {
          gql: (data) => {
            const r = data as { project: { id: string; isPublic: boolean } };
            expect(r.project.id).toBe(fixture.project.projectId);
            expect(r.project.isPublic).toBe(c.project === 'public');
          },
          rest: (body) => {
            const r = body as { id: string; isPublic: boolean };
            expect(r.id).toBe(fixture.project.projectId);
            expect(r.isPublic).toBe(c.project === 'public');
          },
        },
      };
    },
  });
});
