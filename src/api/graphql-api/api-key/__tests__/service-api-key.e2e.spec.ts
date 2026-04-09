import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  prepareDataWithRoles,
  PrepareDataWithRolesReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

const CREATE_SERVICE_API_KEY = `
  mutation CreateServiceApiKey($data: CreateServiceApiKeyInput!) {
    createServiceApiKey(data: $data) {
      apiKey {
        id
        prefix
        type
        name
        organizationId
        projectIds
        branchNames
        tableIds
        readOnly
        allowedIps
        permissions
        expiresAt
        lastUsedAt
        createdAt
        revokedAt
      }
      secret
    }
  }
`;

const SERVICE_API_KEYS = `
  query ServiceApiKeys($organizationId: String!) {
    serviceApiKeys(organizationId: $organizationId) {
      id
      prefix
      type
      name
      permissions
      readOnly
      revokedAt
    }
  }
`;

const REVOKE_API_KEY = `
  mutation RevokeApiKey($id: ID!) {
    revokeApiKey(id: $id) {
      id
      name
      revokedAt
    }
  }
`;

const ROTATE_API_KEY = `
  mutation RotateApiKey($id: ID!) {
    rotateApiKey(id: $id) {
      apiKey {
        id
        name
        revokedAt
      }
      secret
    }
  }
`;

describe('Service API Key Management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const graphqlRequest = (token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  describe('Service key creation', () => {
    let preparedData: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      preparedData = await prepareDataWithRoles(app);
    });

    it('should create a service key as org owner', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Integration Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row', 'Table'] }],
              },
            },
          },
        })
        .expect(200);

      const result = response.body.data.createServiceApiKey;
      expect(result.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(result.apiKey.type).toBe('SERVICE');
      expect(result.apiKey.organizationId).toBe(
        preparedData.project.organizationId,
      );
      expect(result.apiKey.permissions).toEqual({
        rules: [{ action: ['read'], subject: ['Row', 'Table'] }],
      });
    });

    it('should create a service key with scopes', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Scoped Service Key',
              organizationId: preparedData.project.organizationId,
              projectIds: [preparedData.project.projectId],
              branchNames: ['master'],
              readOnly: true,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const apiKey = response.body.data.createServiceApiKey.apiKey;
      expect(apiKey.projectIds).toEqual([preparedData.project.projectId]);
      expect(apiKey.branchNames).toEqual(['master']);
      expect(apiKey.readOnly).toBe(true);
    });

    it('should allow service key creation by developer (has manage-api-key)', async () => {
      const response = await graphqlRequest(preparedData.developer.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Developer Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const result = response.body.data.createServiceApiKey;
      expect(result.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(result.apiKey.type).toBe('SERVICE');
    });

    it('should reject service key creation by admin of another org', async () => {
      const response = await graphqlRequest(preparedData.anotherOwner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Cross-Org Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'do not have permission to manage API keys',
      );
    });

    it('should reject service key with invalid action', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Bad Action Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['invalid'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid action');
    });

    it('should reject service key with invalid subject', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Bad Subject Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Invalid'] }],
              },
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid subject');
    });
  });

  describe('Service key listing', () => {
    let preparedData: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      preparedData = await prepareDataWithRoles(app);
    });

    it('should list service keys for org admin', async () => {
      await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Service Key Alpha',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: SERVICE_API_KEYS,
          variables: {
            organizationId: preparedData.project.organizationId,
          },
        })
        .expect(200);

      const keys = response.body.data.serviceApiKeys;
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys[0].type).toBe('SERVICE');
      const names = keys.map((k: { name: string }) => k.name);
      expect(names).toContain('Service Key Alpha');
    });

    it('should reject listing by reader (no manage-api-key)', async () => {
      const response = await graphqlRequest(preparedData.reader.token)
        .send({
          query: SERVICE_API_KEYS,
          variables: {
            organizationId: preparedData.project.organizationId,
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'do not have permission to manage API keys',
      );
    });
  });

  describe('Service key revoke and rotate', () => {
    let preparedData: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      preparedData = await prepareDataWithRoles(app);
    });

    it('should allow org admin to revoke a service key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'To Revoke',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const keyId = createResponse.body.data.createServiceApiKey.apiKey.id;

      const revokeResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      expect(revokeResponse.body.data.revokeApiKey.revokedAt).not.toBeNull();
    });

    it('should reject revoke by reader (no manage-api-key)', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Not Yours',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const keyId = createResponse.body.data.createServiceApiKey.apiKey.id;

      const revokeResponse = await graphqlRequest(preparedData.reader.token)
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      expect(revokeResponse.body.errors).toBeDefined();
    });

    it('should reject revoke by admin of another org', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Org A Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const keyId = createResponse.body.data.createServiceApiKey.apiKey.id;

      const revokeResponse = await graphqlRequest(
        preparedData.anotherOwner.token,
      )
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      expect(revokeResponse.body.errors).toBeDefined();
    });

    it('should allow org admin to rotate a service key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'To Rotate',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [{ action: ['read'], subject: ['Row'] }],
              },
            },
          },
        })
        .expect(200);

      const originalId = createResponse.body.data.createServiceApiKey.apiKey.id;

      const rotateResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: ROTATE_API_KEY,
          variables: { id: originalId },
        })
        .expect(200);

      const rotated = rotateResponse.body.data.rotateApiKey;
      expect(rotated.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(rotated.apiKey.id).not.toBe(originalId);
    });
  });

  describe('Service key authentication and permission enforcement', () => {
    let preparedData: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      preparedData = await prepareDataWithRoles(app);
    });

    it('should allow read access with read-only service key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Read Only Service',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [
                  {
                    action: ['read'],
                    subject: ['Row', 'Table', 'Project', 'Branch', 'Revision'],
                  },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(200);
    });

    it('should reject revoked service key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Revoke Me',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [
                  { action: ['read'], subject: ['Row', 'Table', 'Revision'] },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;
      const keyId = createResponse.body.data.createServiceApiKey.apiKey.id;

      await graphqlRequest(preparedData.owner.token)
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(401);
    });

    it('should store organizationId on service key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Org Scoped Service',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [
                  {
                    action: ['read'],
                    subject: ['Row', 'Table', 'Project', 'Branch', 'Revision'],
                  },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;
      const apiKeyModel = createResponse.body.data.createServiceApiKey.apiKey;
      expect(apiKeyModel.organizationId).toBe(
        preparedData.project.organizationId,
      );

      // Access own org's data — should succeed
      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(200);
    });

    it('should scope service key to specific project', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Project Scoped Service',
              organizationId: preparedData.project.organizationId,
              projectIds: [preparedData.project.projectId],
              permissions: {
                rules: [
                  {
                    action: ['read'],
                    subject: ['Row', 'Table', 'Project', 'Branch', 'Revision'],
                  },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;
      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(200);
    });

    it('should allow write with update permission', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Write Service Key',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [
                  {
                    action: ['read', 'update'],
                    subject: ['Row', 'Table', 'Project', 'Branch', 'Revision'],
                  },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .put(rowUrl)
        .set('X-Api-Key', apiKey)
        .send({ data: { ver: 99 } })
        .expect(200);
    });

    it('should deny write with read-only permissions', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Read Only Service',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [
                  {
                    action: ['read'],
                    subject: ['Row', 'Table', 'Project', 'Branch', 'Revision'],
                  },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .put(rowUrl)
        .set('X-Api-Key', apiKey)
        .send({ data: { ver: 99 } })
        .expect(403);
    });

    it('should deny action blocked by inverted (cannot) rule', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_SERVICE_API_KEY,
          variables: {
            data: {
              name: 'Cannot Delete Service',
              organizationId: preparedData.project.organizationId,
              permissions: {
                rules: [
                  {
                    action: ['read', 'update', 'delete'],
                    subject: ['Row', 'Table', 'Project', 'Branch', 'Revision'],
                  },
                  {
                    action: ['delete'],
                    subject: ['Row'],
                    inverted: true,
                  },
                ],
              },
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createServiceApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(200);

      await request(app.getHttpServer())
        .delete(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(403);
    });
  });
});
