import { gql } from 'src/testing/utils/gql';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface DeleteProjectParams {
  organizationId: string;
  projectName: string;
}

const deleteProject = operation<DeleteProjectParams>({
  id: 'project.delete',
  rest: {
    method: 'delete',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}`,
  },
  gql: {
    query: gql`
      mutation deleteProject($data: DeleteProjectInput!) {
        deleteProject(data: $data)
      }
    `,
    variables: ({ organizationId, projectName }) => ({
      data: { organizationId, projectName },
    }),
  },
});

// Delete requires org-owner / project-update permission; only owner passes.
// Anon short-circuits at authentication → unauthorized (not forbidden).
const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('delete project auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: deleteProject,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
      },
      assert: booleanMutationAssert('deleteProject'),
    }),
  });
});
