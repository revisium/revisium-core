import { gql } from 'src/testing/utils/gql';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface UpdateProjectParams {
  organizationId: string;
  projectName: string;
  isPublic: boolean;
}

const updateProject = operation<UpdateProjectParams>({
  id: 'project.update',
  rest: {
    method: 'put',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}`,
    body: ({ isPublic }) => ({ isPublic }),
  },
  gql: {
    query: gql`
      mutation updateProject($data: UpdateProjectInput!) {
        updateProject(data: $data)
      }
    `,
    variables: ({ organizationId, projectName, isPublic }) => ({
      data: { organizationId, projectName, isPublic },
    }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('update project auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: updateProject,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        isPublic: true,
      },
      assert: booleanMutationAssert('updateProject'),
    }),
  });
});
