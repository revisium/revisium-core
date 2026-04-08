import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const CREATE_PERSONAL_API_KEY = `
  mutation CreatePersonalApiKey($data: CreatePersonalApiKeyInput!) {
    createPersonalApiKey(data: $data) {
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
        expiresAt
        lastUsedAt
        createdAt
        revokedAt
      }
      secret
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

const MY_API_KEYS = `
  query MyApiKeys {
    myApiKeys {
      id
      prefix
      type
      name
      readOnly
      revokedAt
    }
  }
`;

const API_KEY_BY_ID = `
  query ApiKeyById($id: ID!) {
    apiKeyById(id: $id) {
      id
      name
      type
      prefix
      organizationId
      projectIds
      branchNames
    }
  }
`;

const API_KEY_WITH_PROJECTS = `
  query ApiKeyById($id: ID!) {
    apiKeyById(id: $id) {
      id
      projectIds
      projects {
        id
        name
        organizationId
      }
    }
  }
`;

describe('API Key Management (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prismaService = app.get(PrismaService);
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

  describe('Key management via GraphQL', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should create a personal API key', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: { name: 'CI/CD Key' },
          },
        })
        .expect(200);

      const result = response.body.data.createPersonalApiKey;
      expect(result.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(result.apiKey.id).toBeDefined();
      expect(result.apiKey.name).toBe('CI/CD Key');
      expect(result.apiKey.type).toBe('PERSONAL');
      const random = result.secret.slice('rev_'.length);
      expect(result.apiKey.prefix).toBe(
        `rev_${random.slice(0, 4)}...${random.slice(-4)}`,
      );
      expect(result.apiKey.readOnly).toBe(false);
      expect(result.apiKey.revokedAt).toBeNull();
    });

    it('should create a key with scopes', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Scoped Key',
              organizationId: preparedData.project.organizationId,
              projectIds: [preparedData.project.projectId],
              branchNames: ['master'],
              readOnly: true,
            },
          },
        })
        .expect(200);

      const apiKey = response.body.data.createPersonalApiKey.apiKey;
      expect(apiKey.organizationId).toBe(preparedData.project.organizationId);
      expect(apiKey.projectIds).toEqual([preparedData.project.projectId]);
      expect(apiKey.branchNames).toEqual(['master']);
      expect(apiKey.readOnly).toBe(true);
    });

    it('should list user keys via myApiKeys', async () => {
      // Create two keys
      await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Key Alpha' } },
        })
        .expect(200);

      await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Key Beta' } },
        })
        .expect(200);

      const response = await graphqlRequest(preparedData.owner.token)
        .send({ query: MY_API_KEYS })
        .expect(200);

      const keys = response.body.data.myApiKeys;
      expect(keys.length).toBeGreaterThanOrEqual(2);
      const names = keys.map((k: any) => k.name);
      expect(names).toContain('Key Alpha');
      expect(names).toContain('Key Beta');
    });

    it('should not return secret in list query', async () => {
      await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Secret Test' } },
        })
        .expect(200);

      const response = await graphqlRequest(preparedData.owner.token)
        .send({ query: MY_API_KEYS })
        .expect(200);

      for (const key of response.body.data.myApiKeys) {
        expect(key.secret).toBeUndefined();
      }
    });

    it('should get key by id', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Get By ID' } },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: API_KEY_BY_ID,
          variables: { id: keyId },
        })
        .expect(200);

      expect(response.body.data.apiKeyById.id).toBe(keyId);
      expect(response.body.data.apiKeyById.name).toBe('Get By ID');
    });

    it('should resolve projects field with project details', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Projects Test',
              projectIds: [preparedData.project.projectId],
            },
          },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: API_KEY_WITH_PROJECTS,
          variables: { id: keyId },
        })
        .expect(200);

      const apiKey = response.body.data.apiKeyById;
      expect(apiKey.projects).toHaveLength(1);
      expect(apiKey.projects[0].id).toBe(preparedData.project.projectId);
      expect(apiKey.projects[0].name).toBe(preparedData.project.projectName);
      expect(apiKey.projects[0].organizationId).toBe(
        preparedData.project.organizationId,
      );
    });

    it('should return empty projects array when no projectIds', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'No Projects' } },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: API_KEY_WITH_PROJECTS,
          variables: { id: keyId },
        })
        .expect(200);

      expect(response.body.data.apiKeyById.projects).toEqual([]);
    });

    it('should not allow another user to get key by id', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Private Key' } },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const response = await graphqlRequest(preparedData.anotherOwner.token)
        .send({
          query: API_KEY_BY_ID,
          variables: { id: keyId },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('API key not found');
    });

    it('should revoke a key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'To Revoke' } },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const revokeResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      expect(revokeResponse.body.data.revokeApiKey.revokedAt).not.toBeNull();
    });

    it('should not allow another user to revoke a key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Not Yours' } },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const revokeResponse = await graphqlRequest(
        preparedData.anotherOwner.token,
      )
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      expect(revokeResponse.body.errors).toBeDefined();
      expect(revokeResponse.body.errors[0].message).toContain(
        'API key not found',
      );
    });

    it('should rotate a key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'To Rotate' } },
        })
        .expect(200);

      const originalId =
        createResponse.body.data.createPersonalApiKey.apiKey.id;
      const originalSecret =
        createResponse.body.data.createPersonalApiKey.secret;

      const rotateResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: ROTATE_API_KEY,
          variables: { id: originalId },
        })
        .expect(200);

      const rotated = rotateResponse.body.data.rotateApiKey;
      expect(rotated.secret).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(rotated.secret).not.toBe(originalSecret);
      expect(rotated.apiKey.id).not.toBe(originalId);
    });

    it('should not allow another user to rotate a key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Not Yours' } },
        })
        .expect(200);

      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      const rotateResponse = await graphqlRequest(
        preparedData.anotherOwner.token,
      )
        .send({
          query: ROTATE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      expect(rotateResponse.body.errors).toBeDefined();
      expect(rotateResponse.body.errors[0].message).toContain(
        'API key not found',
      );
    });

    it('should require authentication', async () => {
      const response = await graphqlRequest()
        .send({
          query: MY_API_KEYS,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Access with API key', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should authenticate with API key via Authorization: Bearer header', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Bearer Test' } },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });

    it('should authenticate with API key via X-Api-Key header', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'X-Api-Key Test' } },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', apiKey)
        .expect(200);
    });

    it('should reject a revoked key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: { data: { name: 'Revoke Me' } },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;
      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      // Revoke
      await graphqlRequest(preparedData.owner.token)
        .send({
          query: REVOKE_API_KEY,
          variables: { id: keyId },
        })
        .expect(200);

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(401);
    });

    it('should reject an expired key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Expires Soon',
              expiresAt: new Date(Date.now() + 1000).toISOString(),
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;
      const keyId = createResponse.body.data.createPersonalApiKey.apiKey.id;

      // Manually expire the key in the DB
      await prismaService.apiKey.update({
        where: { id: keyId },
        data: { expiresAt: new Date('2020-01-01') },
      });

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(401);
    });

    it('should reject an invalid format key', async () => {
      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', 'Bearer rev_invalid')
        .expect(401);
    });
  });

  describe('Scope enforcement', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should allow access to scoped organization', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Org Scoped',
              organizationId: preparedData.project.organizationId,
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });

    it('should deny access to another organization', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Org Scoped',
              organizationId: preparedData.project.organizationId,
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.anotherProject.draftRevisionId}/tables/${preparedData.anotherProject.tableId}/rows/${preparedData.anotherProject.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(403);
    });

    it('should allow access to scoped project', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Project Scoped',
              projectIds: [preparedData.project.projectId],
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });

    it('should deny access to another project', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Project Scoped',
              projectIds: [preparedData.project.projectId],
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.anotherProject.draftRevisionId}/tables/${preparedData.anotherProject.tableId}/rows/${preparedData.anotherProject.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(403);
    });

    it('should allow access to scoped branch', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Branch Scoped',
              branchNames: [preparedData.project.branchName],
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });

    // Branch scope is enforced only when the request includes a branch name
    // (e.g., GraphQL queries with branchName arg). REST routes use revisionId,
    // so the guard does not resolve the branch name from the URL.
    it('should store branch scope on key', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'Branch Scoped',
              branchNames: ['nonexistent-branch'],
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.apiKey;
      expect(apiKey.branchNames).toEqual(['nonexistent-branch']);
    });

    it('should allow $default branch to access root branch', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: '$default Scoped',
              branchNames: ['$default'],
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });

    it('should enforce readOnly — allow reads', async () => {
      const createResponse = await graphqlRequest(preparedData.owner.token)
        .send({
          query: CREATE_PERSONAL_API_KEY,
          variables: {
            data: {
              name: 'ReadOnly Key',
              readOnly: true,
            },
          },
        })
        .expect(200);

      const apiKey = createResponse.body.data.createPersonalApiKey.secret;

      const rowUrl = `/api/revision/${preparedData.project.draftRevisionId}/tables/${preparedData.project.tableId}/rows/${preparedData.project.rowId}`;

      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });
  });
});
