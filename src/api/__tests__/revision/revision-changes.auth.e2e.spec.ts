import { INestApplication } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { readSharedAppInfo } from 'src/testing/e2e/shared-app/shared-app-info';
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
  let expiredAccessCookie: string;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
    const sharedAppInfo = readSharedAppInfo();
    if (!sharedAppInfo) throw new Error('Shared test app info is unavailable');
    const expiredJwt = sign(
      { sub: 'expired-user', exp: Math.floor(Date.now() / 1000) - 60 },
      sharedAppInfo.jwtSecret,
    );
    expiredAccessCookie = `rev_at=${expiredJwt}`;
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

  // Rejected cookies stay anonymous on a public project (qa#55) but are
  // reported as UNAUTHENTICATED on a private one, so the client knows to
  // refresh rather than to give up.
  it.each([
    ['private', 'rev_at=not-a-jwt', 'UNAUTHENTICATED'],
    ['public', 'rev_at=not-a-jwt', undefined],
    ['private', () => expiredAccessCookie, 'UNAUTHENTICATED'],
    ['public', () => expiredAccessCookie, undefined],
    ['private', 'rev_session=1', 'UNAUTHENTICATED'],
    ['public', 'rev_session=1', undefined],
  ] as const)(
    'answers a %s project request carrying %s without data',
    async (visibility, cookieValue, expectedErrorCode) => {
      const cookie =
        typeof cookieValue === 'function' ? cookieValue() : cookieValue;
      const revisionId = projects[visibility].project.draftRevisionId;
      const response = await gqlQueryRaw({
        app,
        query: revisionChanges.gql!.query,
        variables: revisionChanges.gql!.variables({
          revisionId,
        }),
        headers: {
          Cookie: cookie,
        },
      });

      expect(response.errors?.[0]?.extensions?.code).toBe(expectedErrorCode);
      if (visibility === 'private') {
        expect(response.data).toBeNull();
      } else {
        expect(response.data).toBeDefined();
      }
    },
  );

  it.each([
    ['private', 'rev_at=not-a-jwt', 401],
    ['public', 'rev_at=not-a-jwt', 200],
    ['private', () => expiredAccessCookie, 401],
    ['public', () => expiredAccessCookie, 200],
    ['private', 'rev_session=1', 401],
    ['public', 'rev_session=1', 200],
  ] as const)(
    'answers a %s project REST request carrying %s without data',
    async (visibility, cookieValue, expectedStatus) => {
      const cookie =
        typeof cookieValue === 'function' ? cookieValue() : cookieValue;
      const revisionId = projects[visibility].project.draftRevisionId;
      const response = await request(app.getHttpServer())
        .get(`/api/revision/${revisionId}/changes`)
        .set('Cookie', cookie)
        .expect(expectedStatus);

      if (visibility === 'private') {
        expect(response.body.data).toBeUndefined();
      }
    },
  );
});
