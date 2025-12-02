import { INestApplication } from '@nestjs/common';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp, authGet, anonGet } from 'src/__tests__/e2e/shared';

describe('restapi - user', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /user/me', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    it('authenticated user can get own profile', async () => {
      const result = await authGet(app, '/api/user/me', fixture.owner.token)
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result.id).toBe(fixture.owner.user.id);
      expect(result.username).toBe(fixture.owner.user.username);
    });

    it('returns correct user for different users', async () => {
      const ownerResult = await authGet(
        app,
        '/api/user/me',
        fixture.owner.token,
      )
        .expect(200)
        .then((res) => res.body);

      const anotherOwnerResult = await authGet(
        app,
        '/api/user/me',
        fixture.anotherOwner.token,
      )
        .expect(200)
        .then((res) => res.body);

      expect(ownerResult.id).toBe(fixture.owner.user.id);
      expect(anotherOwnerResult.id).toBe(fixture.anotherOwner.user.id);
      expect(ownerResult.id).not.toBe(anotherOwnerResult.id);
    });

    it('unauthenticated cannot get profile', async () => {
      await anonGet(app, '/api/user/me').expect(401);
    });
  });
});
