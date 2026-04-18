import { gql } from 'src/testing/utils/gql';
import { nanoid } from 'nanoid';
import {
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

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
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createBranch,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.headRevisionId,
        branchName: `br-${nanoid()}`,
      },
    }),
  });
});
