import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface DeleteBranchParams {
  organizationId: string;
  projectName: string;
  branchName: string;
}

const deleteBranch = operation<DeleteBranchParams>({
  id: 'branch.delete',
  rest: {
    method: 'delete',
    url: ({ organizationId, projectName, branchName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}`,
  },
  gql: {
    query: gql`
      mutation deleteBranch($data: DeleteBranchInput!) {
        deleteBranch(data: $data)
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('delete branch auth', () => {
  const fresh = usingFreshProject();
  let secondaryBranchName: string;

  beforeEach(async () => {
    const app = await getTestApp();
    const prisma = app.get(PrismaService);
    // Root branch cannot be deleted; create a throwaway branch under the
    // same project. It has no revisions here — delete is exercising auth,
    // not the full delete semantics (the domain concern lives in the
    // feature spec).
    secondaryBranchName = `branch-${nanoid()}`;
    await prisma.branch.create({
      data: {
        id: nanoid(),
        name: secondaryBranchName,
        projectId: fresh.fixture.project.projectId,
        isRoot: false,
      },
    });
  });

  runAuthMatrix({
    op: deleteBranch,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        branchName: secondaryBranchName,
      },
      assert: booleanMutationAssert('deleteBranch'),
    }),
  });
});
