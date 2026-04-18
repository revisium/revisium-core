import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

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
  const shared = usingSharedProject();

  runAuthMatrix({
    op: revertChanges,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        organizationId: shared.fixture.project.organizationId,
        projectName: shared.fixture.project.projectName,
        branchName: shared.fixture.project.branchName,
      },
    }),
  });
});
