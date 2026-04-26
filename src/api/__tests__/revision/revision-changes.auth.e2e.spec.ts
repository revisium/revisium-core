import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import { gqlQueryRaw } from 'src/testing/e2e/graphql-helpers';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

const revisionChanges = operation<{ revisionId: string }>({
  id: 'revision.changes',
  rest: {
    method: 'get',
    url: ({ revisionId }) => `/api/revision/${revisionId}/changes`,
  },
  gql: {
    query: gql`
      query revisionChanges($data: GetRevisionChangesInput!) {
        revisionChanges(data: $data) {
          totalChanges
        }
      }
    `,
    variables: ({ revisionId }) => ({ data: { revisionId } }),
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

describe('revision changes auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: revisionChanges,
    cases,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: { revisionId: fixture.project.draftRevisionId },
      };
    },
  });

  it.each([
    ['private', () => projects.private.project.draftRevisionId],
    ['public', () => projects.public.project.draftRevisionId],
  ])(
    'rejects invalid rev_at cookie as unauthenticated for %s project',
    async (_name, getRevisionId) => {
      const response = await gqlQueryRaw({
        app,
        query: revisionChanges.gql!.query,
        variables: revisionChanges.gql!.variables({
          revisionId: getRevisionId(),
        }),
        headers: {
          Cookie: 'rev_at=not-a-jwt',
        },
      });

      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(response.data).toBeNull();
    },
  );
});
