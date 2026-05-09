import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getTestApp } from 'src/testing/e2e';
import {
  prepareData,
  prepareDataWithRoles,
  type PrepareDataReturnType,
  type PrepareDataWithRolesReturnType,
} from 'src/testing/utils/prepareProject';

describe('API key REST endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });

  const restRequest = (method: 'get' | 'post', url: string, token?: string) => {
    const req = request(app.getHttpServer())[method](url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  describe('Personal API keys', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app, { fullAnotherProject: true });
    });

    it('POST /api/api-keys/personal returns secret + apiKey, secret matches rev_ format', async () => {
      const res = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.owner.token,
      )
        .send({ name: 'CI/CD Key' })
        .expect(201);

      expect(res.body.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(res.body.apiKey.id).toBeDefined();
      expect(res.body.apiKey.type).toBe('PERSONAL');
      expect(res.body.apiKey.name).toBe('CI/CD Key');
      expect(res.body.apiKey.revokedAt).toBeNull();
    });

    it('POST /api/api-keys/personal accepts scope fields', async () => {
      const res = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.owner.token,
      )
        .send({
          name: 'Scoped Key',
          organizationId: preparedData.project.organizationId,
          projectIds: [preparedData.project.projectId],
          branchNames: ['master'],
          readOnly: true,
        })
        .expect(201);

      expect(res.body.apiKey.organizationId).toBe(
        preparedData.project.organizationId,
      );
      expect(res.body.apiKey.projectIds).toEqual([
        preparedData.project.projectId,
      ]);
      expect(res.body.apiKey.branchNames).toEqual(['master']);
      expect(res.body.apiKey.readOnly).toBe(true);
    });

    it('GET /api/api-keys/personal lists own keys only, no secret', async () => {
      const ownCreated = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.owner.token,
      )
        .send({ name: 'List Me' })
        .expect(201);

      const otherCreated = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.anotherOwner.token,
      )
        .send({ name: 'Not Mine' })
        .expect(201);

      const res = await restRequest(
        'get',
        '/api/api-keys/personal',
        preparedData.owner.token,
      ).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((k: { id: string }) => k.id);
      expect(ids).toContain(ownCreated.body.apiKey.id);
      expect(ids).not.toContain(otherCreated.body.apiKey.id);
      for (const key of res.body) {
        expect(key.secret).toBeUndefined();
        expect(key.id).toBeDefined();
      }
    });

    it('GET /api/api-keys/:id returns own key, 404 for cross-user', async () => {
      const created = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.owner.token,
      )
        .send({ name: 'Private Key' })
        .expect(201);
      const keyId = created.body.apiKey.id;

      const own = await restRequest(
        'get',
        `/api/api-keys/${keyId}`,
        preparedData.owner.token,
      ).expect(200);
      expect(own.body.id).toBe(keyId);

      await restRequest(
        'get',
        `/api/api-keys/${keyId}`,
        preparedData.anotherOwner.token,
      ).expect(404);
    });

    it('POST /api/api-keys/:id/rotate returns a fresh secret + new id', async () => {
      const created = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.owner.token,
      )
        .send({ name: 'To Rotate' })
        .expect(201);

      const originalId = created.body.apiKey.id;
      const originalSecret = created.body.secret;

      const rotated = await restRequest(
        'post',
        `/api/api-keys/${originalId}/rotate`,
        preparedData.owner.token,
      ).expect(201);

      expect(rotated.body.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(rotated.body.secret).not.toBe(originalSecret);
      expect(rotated.body.apiKey.id).not.toBe(originalId);
    });

    it('POST /api/api-keys/:id/revoke sets revokedAt, key auth then rejected', async () => {
      const created = await restRequest(
        'post',
        '/api/api-keys/personal',
        preparedData.owner.token,
      )
        .send({ name: 'To Revoke' })
        .expect(201);

      const keyId = created.body.apiKey.id;
      const secret = created.body.secret;

      const revoked = await restRequest(
        'post',
        `/api/api-keys/${keyId}/revoke`,
        preparedData.owner.token,
      ).expect(200);

      expect(revoked.body.id).toBe(keyId);
      expect(revoked.body.revokedAt).not.toBeNull();

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', secret)
        .expect(401);
    });
  });

  describe('Service API keys', () => {
    let preparedData: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      preparedData = await prepareDataWithRoles(app);
    });

    it('POST /api/organization/:organizationId/api-keys/service creates a service key', async () => {
      const res = await restRequest(
        'post',
        `/api/organization/${preparedData.project.organizationId}/api-keys/service`,
        preparedData.owner.token,
      )
        .send({
          name: 'Integration Key',
          permissions: {
            rules: [{ action: ['read'], subject: ['Row', 'Table'] }],
          },
        })
        .expect(201);

      expect(res.body.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(res.body.apiKey.type).toBe('SERVICE');
      expect(res.body.apiKey.organizationId).toBe(
        preparedData.project.organizationId,
      );
      expect(res.body.apiKey.permissions).toEqual({
        rules: [{ action: ['read'], subject: ['Row', 'Table'] }],
      });
    });

    it('GET /api/organization/:organizationId/api-keys/service lists service keys', async () => {
      await restRequest(
        'post',
        `/api/organization/${preparedData.project.organizationId}/api-keys/service`,
        preparedData.owner.token,
      )
        .send({
          name: 'svc-list',
          permissions: { rules: [{ action: ['read'], subject: ['Row'] }] },
        })
        .expect(201);

      const res = await restRequest(
        'get',
        `/api/organization/${preparedData.project.organizationId}/api-keys/service`,
        preparedData.owner.token,
      ).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      for (const key of res.body) {
        expect(key.type).toBe('SERVICE');
        expect(key.organizationId).toBe(preparedData.project.organizationId);
        expect(key.secret).toBeUndefined();
      }
    });

    it('cross-org owner cannot create service keys (403)', async () => {
      await restRequest(
        'post',
        `/api/organization/${preparedData.project.organizationId}/api-keys/service`,
        preparedData.anotherOwner.token,
      )
        .send({
          name: 'cross-org',
          permissions: { rules: [{ action: ['read'], subject: ['Row'] }] },
        })
        .expect(403);
    });

    it('reader cannot list service keys (403)', async () => {
      await restRequest(
        'get',
        `/api/organization/${preparedData.project.organizationId}/api-keys/service`,
        preparedData.reader.token,
      ).expect(403);
    });
  });
});
