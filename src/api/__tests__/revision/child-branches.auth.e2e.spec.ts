import { INestApplication } from '@nestjs/common';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

// REST-only.
const childBranches = operation<{ revisionId: string }>({
  id: 'revision.childBranches',
  rest: {
    method: 'get',
    url: ({ revisionId }) => `/api/revision/${revisionId}/child-branches`,
  },
});

type Visibility = 'private' | 'public';
type Case = AuthMatrixCaseBase & { project: Visibility };

const cases: Case[] = [
  {
    name: 'private — owner',
    project: 'private',
    role: 'owner',
    expected: 'allowed',
  },
  {
    name: 'private — cross-owner',
    project: 'private',
    role: 'crossOwner',
    expected: 'forbidden',
  },
  {
    name: 'private — anonymous',
    project: 'private',
    role: 'anonymous',
    expected: 'forbidden',
  },
  {
    name: 'public  — owner',
    project: 'public',
    role: 'owner',
    expected: 'allowed',
  },
  {
    name: 'public  — cross-owner',
    project: 'public',
    role: 'crossOwner',
    expected: 'allowed',
  },
  {
    name: 'public  — anonymous',
    project: 'public',
    role: 'anonymous',
    expected: 'allowed',
  },
];

describe('child branches auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: childBranches,
    cases,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: { revisionId: fixture.project.draftRevisionId },
      };
    },
  });
});
