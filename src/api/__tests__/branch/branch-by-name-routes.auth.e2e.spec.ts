import { INestApplication } from '@nestjs/common';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  PROJECT_VISIBILITY_MATRIX,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

type BranchParams = {
  organizationId: string;
  projectName: string;
  branchName: string;
};

const makeRestOp = (id: string, path: string, includeQuery = false) =>
  operation<BranchParams>({
    id,
    rest: {
      method: 'get',
      url: ({ organizationId, projectName, branchName }) =>
        `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/${path}`,
      ...(includeQuery ? { query: () => ({ first: 10 }) } : {}),
    },
  });

const endpoints = {
  touched: makeRestOp('branch.touched', 'touched'),
  parentBranch: makeRestOp('branch.parentBranch', 'parent-branch'),
  startRevision: makeRestOp('branch.startRevision', 'start-revision'),
  headRevision: makeRestOp('branch.headRevision', 'head-revision'),
  draftRevision: makeRestOp('branch.draftRevision', 'draft-revision'),
  revisions: makeRestOp('branch.revisions', 'revisions', true),
};

describe('branch-by-name readonly routes auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  for (const [label, op] of Object.entries(endpoints)) {
    describe(label, () => {
      runAuthMatrix({
        op,
        cases: PROJECT_VISIBILITY_MATRIX,
        build: (c) => {
          const fixture = projects[c.project];
          return {
            fixture,
            params: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              branchName: fixture.project.branchName,
            },
          };
        },
      });
    });
  }
});
