import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface CreateProjectParams {
  organizationId: string;
  projectName: string;
}

const createProject = operation<CreateProjectParams>({
  id: 'project.create',
  rest: {
    method: 'post',
    url: ({ organizationId }) => `/api/organization/${organizationId}/projects`,
    body: ({ projectName }) => ({ projectName }),
  },
  gql: {
    query: gql`
      mutation createProject($data: CreateProjectInput!) {
        createProject(data: $data) {
          id
          name
          organizationId
        }
      }
    `,
    variables: ({ organizationId, projectName }) => ({
      data: { organizationId, projectName },
    }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'org-owner', role: 'owner', expected: 'allowed' },
  { name: 'outsider', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('create project auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createProject,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: `new-${nanoid()}`,
      },
      assert: {
        gql: (data) => {
          const r = data as {
            createProject: { id: string; organizationId: string };
          };
          expect(r.createProject.organizationId).toBe(
            fresh.fixture.project.organizationId,
          );
        },
        rest: (body) => {
          const r = body as { id: string; organizationId: string };
          expect(r.organizationId).toBe(fresh.fixture.project.organizationId);
        },
      },
    }),
  });
});
