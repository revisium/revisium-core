import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

// REST-only here; GQL exposes branch.createRevision via the mutation
// bound to CreateBranchInput (tested in create-branch spec).
const createRevision = operation<{
  organizationId: string;
  projectName: string;
  branchName: string;
}>({
  id: 'branch.createRevision',
  rest: {
    method: 'post',
    url: ({ organizationId, projectName, branchName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/create-revision`,
  },
});

describe('create revision (commit) auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: createRevision,
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
