import { INestApplication } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { readSharedAppInfo } from 'src/testing/e2e/shared-app/shared-app-info';
import { gql } from 'src/testing/utils/gql';
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

const getRevision = operation<{ revisionId: string }>({
  id: 'revision.get',
  rest: {
    method: 'get',
    url: ({ revisionId }) => `/api/revision/${revisionId}`,
  },
  gql: {
    query: gql`
      query revision($data: GetRevisionInput!) {
        revision(data: $data) {
          id
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('get revision auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;
  let foreignJwt: string;
  let expiredJwt: string;
  const invalidTokens: ReadonlyArray<readonly [string, () => string]> = [
    ['JWT signed with a foreign secret', () => foreignJwt],
    ['expired Revisium JWT', () => expiredJwt],
  ];

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
    foreignJwt = sign({ sub: 'foreign-user' }, 'foreign-secret');
    const sharedAppInfo = readSharedAppInfo();
    if (!sharedAppInfo) throw new Error('Shared test app info is unavailable');
    expiredJwt = sign(
      { sub: 'expired-user', exp: Math.floor(Date.now() / 1000) - 60 },
      sharedAppInfo.jwtSecret,
    );
  });

  runAuthMatrix({
    op: getRevision,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: { revisionId: fixture.project.draftRevisionId },
      };
    },
  });

  it.each(invalidTokens)(
    'allows a public revision with %s',
    async (_name, getToken) => {
      const response = await request(app.getHttpServer())
        .get(`/api/revision/${projects.public.project.draftRevisionId}`)
        .set('Authorization', `Bearer ${getToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(projects.public.project.draftRevisionId);
    },
  );

  it.each(invalidTokens)(
    'denies a private revision with %s as unauthenticated, without returning data',
    async (_name, getToken) => {
      const response = await request(app.getHttpServer())
        .get(`/api/revision/${projects.private.project.draftRevisionId}`)
        .set('Authorization', `Bearer ${getToken()}`);

      expect(response.status).toBe(401);
      expect(response.body.id).toBeUndefined();
    },
  );
});
