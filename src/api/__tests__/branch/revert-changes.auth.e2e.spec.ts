import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const revertChanges = operation<{
  organizationId: string;
  projectName: string;
  branchName: string;
}>({
  id: 'branch.revertChanges',
  rest: {
    method: 'post',
    url: ({ organizationId, projectName, branchName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/revert-changes`,
  },
  gql: {
    query: gql`
      mutation revertChanges($data: RevertChangesInput!) {
        revertChanges(data: $data) {
          id
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('revert changes auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: revertChanges,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        branchName: fresh.fixture.project.branchName,
      },
    }),
  });
});
