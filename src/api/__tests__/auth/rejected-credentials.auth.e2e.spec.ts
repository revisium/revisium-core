import { INestApplication } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { getTestApp } from 'src/testing/e2e';
import { gqlQueryRaw } from 'src/testing/e2e/graphql-helpers';
import { readSharedAppInfo } from 'src/testing/e2e/shared-app/shared-app-info';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';
import { gql } from 'src/testing/utils/gql';

/**
 * The 401-vs-403 contract on an optional-auth read.
 *
 * Two denials that look alike from the server's side must stay observably
 * different for the client:
 *
 *   no credentials at all  -> 403 / FORBIDDEN     (log in)
 *   credentials rejected   -> 401 / UNAUTHENTICATED (refresh, then retry)
 *
 * `revisium-admin` only retries after a refresh on the second one, so
 * collapsing them breaks silent token refresh for every logged-in user
 * whose 30-minute `rev_at` expired while `rev_session` (7 days) survived.
 */

const REVISION_QUERY = gql`
  query revision($data: GetRevisionInput!) {
    revision(data: $data) {
      id
    }
  }
`;

const ME_QUERY = gql`
  query me {
    me {
      id
    }
  }
`;

type Headers = Record<string, string>;
type Visibility = 'private' | 'public';

const MISSING_REVISION_ID = 'revision-that-does-not-exist';

describe('rejected credentials vs missing credentials', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;
  let foreignJwt: string;
  let expiredJwt: string;
  let revokedJwt: string;

  /**
   * Material that reaches the permission layer with no user attached:
   * Passport either refuses it or never sees a token at all. Each entry is
   * lazy because the JWTs need the shared app's secret, which is only known
   * once `beforeAll` has run.
   */
  const rejectedCredentials: ReadonlyArray<readonly [string, () => Headers]> = [
    [
      'Bearer JWT signed with a foreign secret',
      () => ({ Authorization: `Bearer ${foreignJwt}` }),
    ],
    [
      'Bearer expired Revisium JWT',
      () => ({ Authorization: `Bearer ${expiredJwt}` }),
    ],
    [
      'non-Bearer Authorization scheme',
      () => ({ Authorization: 'Basic dXNlcjpwYXNzd29yZA==' }),
    ],
    ['rev_at cookie holding a non-JWT', () => ({ Cookie: 'rev_at=not-a-jwt' })],
    [
      'rev_at cookie holding an expired JWT',
      () => ({ Cookie: `rev_at=${expiredJwt}` }),
    ],
    ['rev_session=1 without rev_at', () => ({ Cookie: 'rev_session=1' })],
  ];

  const restRevision = (revisionId: string, headers: Headers) => {
    const req = request(app.getHttpServer()).get(`/api/revision/${revisionId}`);
    for (const [name, value] of Object.entries(headers)) {
      req.set(name, value);
    }
    return req;
  };

  const gqlRevision = (revisionId: string, headers: Headers) =>
    gqlQueryRaw({
      app,
      query: REVISION_QUERY,
      variables: { data: { revisionId } },
      headers,
    });

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);

    const sharedAppInfo = readSharedAppInfo();
    if (!sharedAppInfo) throw new Error('Shared test app info is unavailable');

    foreignJwt = sign({ sub: 'foreign-user' }, 'foreign-secret');
    expiredJwt = sign(
      { sub: 'expired-user', exp: Math.floor(Date.now() / 1000) - 60 },
      sharedAppInfo.jwtSecret,
    );
    // `ver` no longer matches the user's tokenVersion, so the strategy
    // rejects it outright rather than letting Passport fall through.
    revokedJwt = sign(
      { sub: projects.private.owner.user.id, ver: 9999 },
      sharedAppInfo.jwtSecret,
    );
  });

  describe.each(rejectedCredentials)('with %s', (_name, getHeaders) => {
    it('REST: reads the public revision (200)', async () => {
      const revisionId = projects.public.project.draftRevisionId;

      const response = await restRevision(revisionId, getHeaders());

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(revisionId);
    });

    it('GraphQL: reads the public revision', async () => {
      const revisionId = projects.public.project.draftRevisionId;

      const response = await gqlRevision(revisionId, getHeaders());

      expect(response.errors).toBeUndefined();
      expect(response.data).toEqual({ revision: { id: revisionId } });
    });

    it('REST: denies the private revision with 401', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await restRevision(revisionId, getHeaders());

      expect(response.status).toBe(401);
      expect(response.body.id).toBeUndefined();
    });

    it('GraphQL: denies the private revision with UNAUTHENTICATED', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await gqlRevision(revisionId, getHeaders());

      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(response.data).toBeNull();
    });

    it('REST: keeps 404 for a revision that does not exist', async () => {
      const response = await restRevision(MISSING_REVISION_ID, getHeaders());

      expect(response.status).toBe(404);
    });

    it('GraphQL: keeps NOT_FOUND for a revision that does not exist', async () => {
      const response = await gqlRevision(MISSING_REVISION_ID, getHeaders());

      expect(response.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    });
  });

  describe('without any credentials', () => {
    it('REST: reads the public revision (200)', async () => {
      const revisionId = projects.public.project.draftRevisionId;

      const response = await restRevision(revisionId, {});

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(revisionId);
    });

    it('GraphQL: reads the public revision', async () => {
      const revisionId = projects.public.project.draftRevisionId;

      const response = await gqlRevision(revisionId, {});

      expect(response.errors).toBeUndefined();
      expect(response.data).toEqual({ revision: { id: revisionId } });
    });

    it('REST: denies the private revision with 403', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await restRevision(revisionId, {});

      expect(response.status).toBe(403);
      expect(response.body.id).toBeUndefined();
    });

    it('GraphQL: denies the private revision with FORBIDDEN', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await gqlRevision(revisionId, {});

      expect(response.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(response.data).toBeNull();
    });
  });

  describe('with valid credentials', () => {
    it('REST: the owner reads their private revision (200)', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await restRevision(revisionId, {
        Authorization: `Bearer ${projects.private.owner.token}`,
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(revisionId);
    });

    it('REST: a non-member is forbidden, not unauthenticated', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await restRevision(revisionId, {
        Authorization: `Bearer ${projects.private.anotherOwner.token}`,
      });

      expect(response.status).toBe(403);
    });

    it('GraphQL: a non-member is forbidden, not unauthenticated', async () => {
      const revisionId = projects.private.project.draftRevisionId;

      const response = await gqlRevision(revisionId, {
        Authorization: `Bearer ${projects.private.anotherOwner.token}`,
      });

      expect(response.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    });

    /**
     * The invariant that keeps the fix narrow: an API key that authenticates
     * fine but lacks the rights is a permission problem, not an
     * authentication problem. Refreshing a token would not help, so it must
     * not be advertised as 401.
     */
    it('REST: a valid API key without rights stays 403', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/api-keys/personal')
        .set('Authorization', `Bearer ${projects.private.anotherOwner.token}`)
        .send({ name: 'outsider key' })
        .expect(201);

      const response = await restRevision(
        projects.private.project.draftRevisionId,
        { 'x-api-key': created.body.secret },
      );

      expect(response.status).toBe(403);
    });

    it('GraphQL: a valid API key without rights stays FORBIDDEN', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/api-keys/personal')
        .set('Authorization', `Bearer ${projects.private.anotherOwner.token}`)
        .send({ name: 'outsider key gql' })
        .expect(201);

      const response = await gqlRevision(
        projects.private.project.draftRevisionId,
        { 'x-api-key': created.body.secret },
      );

      expect(response.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    });
  });

  /**
   * `rev_session` is not httpOnly, so any visitor can set it by hand. It may
   * only downgrade the denial to 401 — never grant access, and never mask a
   * missing resource.
   */
  describe('with a hand-set rev_session=1 and nothing else', () => {
    const cookie = { Cookie: 'rev_session=1' };

    it('REST: does not open the private revision', async () => {
      const response = await restRevision(
        projects.private.project.draftRevisionId,
        cookie,
      );

      expect(response.status).toBe(401);
      expect(response.body.id).toBeUndefined();
    });

    it('GraphQL: leaks no resource fields', async () => {
      const response = await gqlRevision(
        projects.private.project.draftRevisionId,
        cookie,
      );

      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(response.data).toBeNull();
    });

    it('REST: keeps 404 for a revision that does not exist', async () => {
      const response = await restRevision(MISSING_REVISION_ID, cookie);

      expect(response.status).toBe(404);
    });
  });

  /**
   * Pre-ADR behaviour that this change must not touch: these credentials are
   * rejected inside `authenticate()` / the Passport strategy and never reach
   * the permission layer, so they answer 401 even on a public resource.
   */
  describe('credentials rejected before the permission layer', () => {
    /** Every way an API key can be presented, on both visibilities. */
    const badApiKeyRequests: ReadonlyArray<
      readonly [string, (visibility: Visibility) => request.Test]
    > = [
      [
        'x-api-key header',
        (visibility) =>
          restRevision(projects[visibility].project.draftRevisionId, {
            'x-api-key': 'rev_AAAAAAAAAAAAAAAAAAAAAA',
          }),
      ],
      [
        'api_key query parameter',
        (visibility) =>
          restRevision(projects[visibility].project.draftRevisionId, {}).query({
            api_key: 'rev_BAD',
          }),
      ],
      [
        'rev_-prefixed Bearer token',
        (visibility) =>
          restRevision(projects[visibility].project.draftRevisionId, {
            Authorization: 'Bearer rev_BAD',
          }),
      ],
    ];

    describe.each(badApiKeyRequests)(
      'an invalid API key via %s',
      (_name, send) => {
        it.each(['public', 'private'] as const)(
          'REST: is 401 on a %s revision',
          async (visibility) => {
            const response = await send(visibility);

            expect(response.status).toBe(401);
          },
        );
      },
    );

    it.each(['public', 'private'] as const)(
      'REST: a revoked-version JWT is 401 on a %s revision',
      async (visibility) => {
        const response = await restRevision(
          projects[visibility].project.draftRevisionId,
          { Authorization: `Bearer ${revokedJwt}` },
        );

        expect(response.status).toBe(401);
      },
    );
  });

  /** Mandatory guards keep answering 401 regardless of this change. */
  describe('mandatory guard on me', () => {
    it('GraphQL: no credentials', async () => {
      const response = await gqlQueryRaw({ app, query: ME_QUERY, headers: {} });

      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('GraphQL: rejected credentials', async () => {
      const response = await gqlQueryRaw({
        app,
        query: ME_QUERY,
        headers: { Authorization: `Bearer ${foreignJwt}` },
      });

      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });
  });
});
