import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

interface UsersProjectParams {
  organizationId: string;
  projectName: string;
}

const usersProject = operation<UsersProjectParams>({
  id: 'project.usersProject',
  rest: {
    method: 'get',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/users`,
    query: () => ({ first: 10 }),
  },
  gql: {
    query: gql`
      query usersProject($data: GetUsersProjectInput!) {
        usersProject(data: $data) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
      }
    `,
    variables: ({ organizationId, projectName }) => ({
      data: { organizationId, projectName, first: 10 },
    }),
  },
});

type Visibility = 'private' | 'public';
type MatrixCase = AuthMatrixCaseBase & { project: Visibility };

// User listing is PII — gated by project membership regardless of public-ness.
// Public project does NOT grant anon read on /users; cross-owner also forbidden.
const cases: MatrixCase[] = [
  {
    name: 'private — owner',
    project: 'private',
    role: 'owner',
    expected: 'allowed',
  },
  {
    name: 'private — cross-owner',
    project: 'private',
    role: 'crossOwner',
    expected: 'forbidden',
  },
  {
    name: 'private — anonymous',
    project: 'private',
    role: 'anonymous',
    expected: 'unauthorized',
  },
  {
    name: 'public  — owner',
    project: 'public',
    role: 'owner',
    expected: 'allowed',
  },
  {
    name: 'public  — cross-owner',
    project: 'public',
    role: 'crossOwner',
    expected: 'forbidden',
  },
  {
    name: 'public  — anonymous',
    project: 'public',
    role: 'anonymous',
    expected: 'unauthorized',
  },
];

describe('users-project auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: usersProject,
    cases,
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
            const r = data as { usersProject: { totalCount: number } };
            expect(r.usersProject.totalCount).toBeGreaterThanOrEqual(0);
          },
          rest: (body) => {
            const r = body as { totalCount: number };
            expect(r.totalCount).toBeGreaterThanOrEqual(0);
          },
        },
      };
    },
  });
});
