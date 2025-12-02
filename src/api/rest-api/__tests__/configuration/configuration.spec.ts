import { INestApplication } from '@nestjs/common';
import { createFreshTestApp, anonGet } from 'src/__tests__/e2e/shared';

describe('restapi - configuration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /configuration', () => {
    it('returns configuration without authentication', async () => {
      const result = await anonGet(app, '/api/configuration')
        .expect(200)
        .then((res) => res.body);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('returns expected configuration properties', async () => {
      const result = await anonGet(app, '/api/configuration')
        .expect(200)
        .then((res) => res.body);

      expect(result).toHaveProperty('availableEmailSignUp');
      expect(result).toHaveProperty('google');
      expect(result).toHaveProperty('github');
      expect(result.google).toHaveProperty('available');
      expect(result.github).toHaveProperty('available');
    });
  });
});
