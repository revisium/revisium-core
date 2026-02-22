import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHash } from 'node:crypto';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { AuthService } from 'src/features/auth/auth.service';

describe('OAuth Controller', () => {
  let app: INestApplication;
  let authService: AuthService;
  let fixture: PrepareDataReturnType;
  let userToken: string;

  beforeAll(async () => {
    app = await createFreshTestApp();
    authService = app.get(AuthService);
    fixture = await prepareData(app);
    userToken = authService.login({
      username: fixture.owner.user.username,
      sub: fixture.owner.user.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /.well-known/oauth-authorization-server', () => {
    it('returns authorization server metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/.well-known/oauth-authorization-server')
        .expect(200);

      expect(res.body).toMatchObject({
        issuer: expect.any(String),
        authorization_endpoint: expect.stringContaining('/oauth/authorize'),
        token_endpoint: expect.stringContaining('/oauth/token'),
        registration_endpoint: expect.stringContaining('/oauth/register'),
        revocation_endpoint: expect.stringContaining('/oauth/revoke'),
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        revocation_endpoint_auth_methods_supported: ['client_secret_post'],
      });
    });
  });

  describe('GET /.well-known/oauth-protected-resource', () => {
    it('returns protected resource metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/.well-known/oauth-protected-resource')
        .expect(200);

      expect(res.body).toMatchObject({
        resource: expect.any(String),
        authorization_servers: expect.any(Array),
        bearer_methods_supported: ['header'],
      });
    });
  });

  describe('POST /oauth/register', () => {
    it('registers a new client', async () => {
      const res = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'test-app',
          redirect_uris: ['https://example.com/callback'],
          grant_types: ['authorization_code', 'refresh_token'],
        })
        .expect(201);

      expect(res.body).toMatchObject({
        client_id: expect.any(String),
        client_secret: expect.stringMatching(/^ocs_/),
        client_name: 'test-app',
        redirect_uris: ['https://example.com/callback'],
      });
    });

    it('rejects missing client_name', async () => {
      await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          redirect_uris: ['https://example.com/callback'],
        })
        .expect(400);
    });

    it('rejects missing redirect_uris', async () => {
      await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'test-app',
        })
        .expect(400);
    });

    it('rejects http redirect_uri for non-localhost', async () => {
      await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'test-app',
          redirect_uris: ['http://example.com/callback'],
        })
        .expect(400);
    });
  });

  describe('GET /oauth/authorize', () => {
    it('redirects to authorize page with valid params', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'authorize-test',
          redirect_uris: ['https://example.com/callback'],
        });

      const clientId = regRes.body.client_id;

      const res = await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: 'https://example.com/callback',
          code_challenge: 'test_challenge',
          code_challenge_method: 'S256',
          response_type: 'code',
          state: 'test_state',
        })
        .expect(302);

      expect(res.headers.location).toContain('/authorize?');
      expect(res.headers.location).toContain('client_id=');
      expect(res.headers.location).toContain('client_name=authorize-test');
    });

    it('rejects missing parameters', async () => {
      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({ client_id: 'test' })
        .expect(400);
    });

    it('rejects invalid response_type', async () => {
      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          client_id: 'test',
          redirect_uri: 'https://example.com/callback',
          code_challenge: 'challenge',
          code_challenge_method: 'S256',
          response_type: 'token',
          state: 'state',
        })
        .expect(400);
    });

    it('rejects non-S256 code_challenge_method', async () => {
      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          client_id: 'test',
          redirect_uri: 'https://example.com/callback',
          code_challenge: 'challenge',
          code_challenge_method: 'plain',
          response_type: 'code',
          state: 'state',
        })
        .expect(400);
    });

    it('rejects unknown client_id', async () => {
      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          client_id: 'nonexistent',
          redirect_uri: 'https://example.com/callback',
          code_challenge: 'challenge',
          code_challenge_method: 'S256',
          response_type: 'code',
          state: 'state',
        })
        .expect(400);
    });

    it('rejects invalid redirect_uri for client', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'redirect-test',
          redirect_uris: ['https://example.com/callback'],
        });

      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          client_id: regRes.body.client_id,
          redirect_uri: 'https://evil.com/callback',
          code_challenge: 'challenge',
          code_challenge_method: 'S256',
          response_type: 'code',
          state: 'state',
        })
        .expect(400);
    });
  });

  describe('POST /oauth/authorize', () => {
    it('returns redirect_uri with code on success', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'post-authorize-test',
          redirect_uris: ['https://example.com/callback'],
        });

      const res = await request(app.getHttpServer())
        .post('/oauth/authorize')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          client_id: regRes.body.client_id,
          redirect_uri: 'https://example.com/callback',
          code_challenge: 'test_challenge',
          state: 'test_state',
        })
        .expect(201);

      expect(res.body.redirect_uri).toContain('code=');
      expect(res.body.redirect_uri).toContain('state=test_state');
    });

    it('rejects without Bearer token', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'no-bearer-test',
          redirect_uris: ['https://example.com/callback'],
        });

      await request(app.getHttpServer())
        .post('/oauth/authorize')
        .send({
          client_id: regRes.body.client_id,
          redirect_uri: 'https://example.com/callback',
          code_challenge: 'challenge',
          state: 'state',
        })
        .expect(401);
    });

    it('rejects missing fields', async () => {
      await request(app.getHttpServer())
        .post('/oauth/authorize')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ client_id: 'test' })
        .expect(400);
    });
  });

  describe('POST /oauth/token', () => {
    it('exchanges authorization code for tokens', async () => {
      const codeVerifier = 'test_code_verifier_that_is_long_enough_for_pkce';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'token-test',
          redirect_uris: ['https://example.com/callback'],
        });

      const { client_id, client_secret } = regRes.body;

      const authRes = await request(app.getHttpServer())
        .post('/oauth/authorize')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          client_id,
          redirect_uri: 'https://example.com/callback',
          code_challenge: codeChallenge,
          state: 'token_test_state',
        })
        .expect(201);

      const redirectUrl = new URL(authRes.body.redirect_uri);
      const code = redirectUrl.searchParams.get('code');
      expect(code).toBeTruthy();

      const tokenRes = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id,
          client_secret,
          code_verifier: codeVerifier,
          redirect_uri: 'https://example.com/callback',
        })
        .expect(201);

      expect(tokenRes.body).toMatchObject({
        access_token: expect.stringMatching(/^oat_/),
        refresh_token: expect.stringMatching(/^ort_/),
        token_type: 'Bearer',
        expires_in: 3600,
      });
    });

    it('refreshes token', async () => {
      const codeVerifier = 'refresh_test_code_verifier_that_is_long_enough';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'refresh-test',
          redirect_uris: ['https://example.com/callback'],
        });

      const { client_id, client_secret } = regRes.body;

      const authRes = await request(app.getHttpServer())
        .post('/oauth/authorize')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          client_id,
          redirect_uri: 'https://example.com/callback',
          code_challenge: codeChallenge,
          state: 'refresh_state',
        })
        .expect(201);

      const redirectUrl = new URL(authRes.body.redirect_uri);
      const code = redirectUrl.searchParams.get('code');

      const tokenRes = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id,
          client_secret,
          code_verifier: codeVerifier,
          redirect_uri: 'https://example.com/callback',
        });

      const refreshRes = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'refresh_token',
          client_id,
          client_secret,
          refresh_token: tokenRes.body.refresh_token,
        })
        .expect(201);

      expect(refreshRes.body).toMatchObject({
        access_token: expect.stringMatching(/^oat_/),
        refresh_token: expect.stringMatching(/^ort_/),
        token_type: 'Bearer',
      });
    });

    it('rejects unsupported grant_type', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({ grant_type: 'client_credentials' })
        .expect(400);
    });

    it('rejects missing params for authorization_code', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({ grant_type: 'authorization_code', code: 'test' })
        .expect(400);
    });

    it('rejects invalid client_secret', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'invalid-secret-test',
          redirect_uris: ['https://example.com/callback'],
        });

      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'test',
          client_id: regRes.body.client_id,
          client_secret: 'ocs_wrong',
          code_verifier: 'test',
          redirect_uri: 'https://example.com/callback',
        })
        .expect(400);
    });

    it('rejects missing params for refresh_token', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({ grant_type: 'refresh_token', client_id: 'test' })
        .expect(400);
    });

    it('rejects invalid client_secret for refresh', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'refresh-invalid-test',
          redirect_uris: ['https://example.com/callback'],
        });

      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'refresh_token',
          client_id: regRes.body.client_id,
          client_secret: 'ocs_wrong',
          refresh_token: 'ort_test',
        })
        .expect(400);
    });
  });

  describe('POST /oauth/revoke', () => {
    const obtainTokens = async () => {
      const codeVerifier = 'revoke_test_code_verifier_that_is_long_enough';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const regRes = await request(app.getHttpServer())
        .post('/oauth/register')
        .send({
          client_name: 'revoke-test',
          redirect_uris: ['https://example.com/callback'],
        });

      const { client_id, client_secret } = regRes.body;

      const authRes = await request(app.getHttpServer())
        .post('/oauth/authorize')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          client_id,
          redirect_uri: 'https://example.com/callback',
          code_challenge: codeChallenge,
          state: 'revoke_state',
        })
        .expect(201);

      const redirectUrl = new URL(authRes.body.redirect_uri);
      const code = redirectUrl.searchParams.get('code');

      const tokenRes = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id,
          client_secret,
          code_verifier: codeVerifier,
          redirect_uri: 'https://example.com/callback',
        })
        .expect(201);

      return {
        client_id,
        client_secret,
        access_token: tokenRes.body.access_token,
        refresh_token: tokenRes.body.refresh_token,
      };
    };

    it('returns 200 on successful access token revocation', async () => {
      const { client_id, client_secret, access_token } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: access_token,
          client_id,
          client_secret,
        })
        .expect(200);
    });

    it('revoked access token is rejected by MCP', async () => {
      const { client_id, client_secret, access_token } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: access_token,
          client_id,
          client_secret,
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', `Bearer ${access_token}`)
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        })
        .expect(401);
    });

    it('returns 200 for unknown token', async () => {
      const { client_id, client_secret } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: 'oat_nonexistent_token_value',
          client_id,
          client_secret,
        })
        .expect(200);
    });

    it('returns 200 for already-revoked token', async () => {
      const { client_id, client_secret, access_token } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({ token: access_token, client_id, client_secret })
        .expect(200);

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({ token: access_token, client_id, client_secret })
        .expect(200);
    });

    it('rejects missing token', async () => {
      const { client_id, client_secret } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({ client_id, client_secret })
        .expect(400);
    });

    it('rejects missing client credentials', async () => {
      const { access_token } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({ token: access_token })
        .expect(400);
    });

    it('rejects invalid client credentials', async () => {
      const { client_id, access_token } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: access_token,
          client_id,
          client_secret: 'ocs_wrong',
        })
        .expect(400);
    });

    it('supports token_type_hint', async () => {
      const { client_id, client_secret, access_token } = await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: access_token,
          token_type_hint: 'access_token',
          client_id,
          client_secret,
        })
        .expect(200);
    });

    it('revoking refresh token cascades to access tokens', async () => {
      const { client_id, client_secret, access_token, refresh_token } =
        await obtainTokens();

      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: refresh_token,
          client_id,
          client_secret,
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', `Bearer ${access_token}`)
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        })
        .expect(401);
    });
  });
});
