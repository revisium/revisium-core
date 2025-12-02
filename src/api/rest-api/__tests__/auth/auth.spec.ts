import { INestApplication } from '@nestjs/common';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  anonPost,
  authPost,
  authPut,
} from 'src/__tests__/e2e/shared';

describe('restapi - auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    it('user can login with username', async () => {
      const result = await anonPost(app, '/api/auth/login', {
        emailOrUsername: fixture.owner.user.username,
        password: 'password',
      })
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('login fails with wrong password', async () => {
      await anonPost(app, '/api/auth/login', {
        emailOrUsername: fixture.owner.user.username,
        password: 'wrong-password',
      }).expect(401);
    });

    it('login fails with non-existent user', async () => {
      await anonPost(app, '/api/auth/login', {
        emailOrUsername: 'non-existent-user',
        password: 'password',
      }).expect(401);
    });
  });

  describe('POST /auth/user (createUser)', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    it('organization owner cannot create user (requires system admin)', async () => {
      const uniqueUsername = `test-user-${Date.now()}`;
      const uniqueEmail = `test-${Date.now()}@example.com`;

      await authPost(app, '/api/auth/user', fixture.owner.token, {
        username: uniqueUsername,
        email: uniqueEmail,
        password: 'securePassword123',
      }).expect(403);
    });

    it('unauthenticated cannot create user', async () => {
      await anonPost(app, '/api/auth/user', {
        username: 'new-user',
        email: 'new@example.com',
        password: 'password',
      }).expect(401);
    });
  });

  describe('PUT /auth/password (updatePassword)', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    it('authenticated user can update own password', async () => {
      await authPut(app, '/api/auth/password', fixture.owner.token, {
        oldPassword: 'password',
        newPassword: 'newSecurePassword123',
      }).expect(200);

      await anonPost(app, '/api/auth/login', {
        emailOrUsername: fixture.owner.user.username,
        password: 'newSecurePassword123',
      }).expect(201);
    });

    it('update password fails with wrong old password', async () => {
      await authPut(app, '/api/auth/password', fixture.owner.token, {
        oldPassword: 'wrong-old-password',
        newPassword: 'newPassword123',
      }).expect(400);
    });

    it('unauthenticated cannot update password', async () => {
      const req = await import('supertest');
      await req
        .default(app.getHttpServer())
        .put('/api/auth/password')
        .send({
          oldPassword: 'password',
          newPassword: 'newPassword',
        })
        .expect(401);
    });
  });
});
