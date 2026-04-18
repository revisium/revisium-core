import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createRevision,
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
