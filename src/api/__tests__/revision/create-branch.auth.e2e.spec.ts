import { gql } from 'src/testing/utils/gql';
import { nanoid } from 'nanoid';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_DENIAL_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingSharedProject } from 'src/testing/scenarios/using-shared-project';

const createBranch = operation<{ revisionId: string; branchName: string }>({
  id: 'revision.createBranch',
  rest: {
    method: 'post',
    url: ({ revisionId }) => `/api/revision/${revisionId}/child-branches`,
    body: ({ branchName }) => ({ branchName }),
  },
  gql: {
    query: gql`
      mutation createBranch($data: CreateBranchInput!) {
        createBranch(data: $data) {
          id
        }
      }
    `,
    variables: ({ revisionId, branchName }) => ({
      data: { revisionId, branchName },
    }),
  },
});

describe('create branch auth', () => {
  const shared = usingSharedProject();

  runAuthMatrix({
    op: createBranch,
    cases: PROJECT_MUTATION_DENIAL_MATRIX,
    build: () => ({
      fixture: shared.fixture,
      params: {
        revisionId: shared.fixture.project.headRevisionId,
        branchName: `br-${nanoid()}`,
      },
    }),
  });
});
