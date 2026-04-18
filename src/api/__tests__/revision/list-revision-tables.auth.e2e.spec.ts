import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
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

interface Params {
  revisionId: string;
}

const listTables = operation<Params>({
  id: 'revision.listTables',
  rest: {
    method: 'get',
    url: ({ revisionId }) => `/api/revision/${revisionId}/tables`,
    query: () => ({ first: 10 }),
  },
  gql: {
    query: gql`
      query tables($data: GetTablesInput!) {
        tables(data: $data) {
          totalCount
        }
      }
    `,
    variables: ({ revisionId }) => ({ data: { revisionId, first: 10 } }),
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

describe('list revision tables auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: listTables,
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
