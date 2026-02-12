import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { gql } from 'src/__tests__/utils/gql';
import {
  anonGet,
  anonPost,
  createFreshTestApp,
  gqlQuery,
} from 'src/__tests__/e2e/shared';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';

const mcpPost = (
  app: INestApplication,
  sessionId: string | null,
  body: object,
) => {
  const req = request(app.getHttpServer())
    .post('/mcp')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream');

  if (sessionId) {
    req.set('mcp-session-id', sessionId);
  }

  return req.send(body);
};

const parseResponse = (res: request.Response) => {
  if (res.text.startsWith('event:') || res.text.startsWith('data:')) {
    const lines = res.text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        return JSON.parse(line.slice(6));
      }
    }
    return null;
  }
  return res.body;
};

const initMcpSession = async (app: INestApplication): Promise<string> => {
  const res = await mcpPost(app, null, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    },
  });
  return res.headers['mcp-session-id'];
};

describe('NO_AUTH mode', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    process.env.REVISIUM_NO_AUTH = 'true';
    app = await createFreshTestApp();
    fixture = await prepareData(app);
  });

  afterAll(async () => {
    delete process.env.REVISIUM_NO_AUTH;
    await app.close();
  });

  describe('REST API', () => {
    it('configuration returns noAuth=true', async () => {
      const result = await anonGet(app, '/api/configuration')
        .expect(200)
        .then((res) => res.body);

      expect(result.noAuth).toBe(true);
    });

    it('GET /projects works without token', async () => {
      const result = await anonGet(
        app,
        `/api/organization/${fixture.project.organizationId}/projects?first=10`,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result).toBeDefined();
    });

    it('GET /revision/:id/tables works without token', async () => {
      const result = await anonGet(
        app,
        `/api/revision/${fixture.project.headRevisionId}/tables?first=10`,
      )
        .expect(200)
        .then((res) => res.body);

      expect(result).toBeDefined();
    });

    it('login accepts any credentials', async () => {
      const result = await anonPost(app, '/api/auth/login', {
        emailOrUsername: 'anything',
        password: 'anything',
      })
        .expect(201)
        .then((res) => res.body);

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });
  });

  describe('GraphQL API', () => {
    it('query works without token', async () => {
      const result = await gqlQuery({
        app,
        query: gql`
          query revision($data: GetRevisionInput!) {
            revision(data: $data) {
              id
              isDraft
            }
          }
        `,
        variables: {
          data: { revisionId: fixture.project.draftRevisionId },
        },
      });

      expect(result.revision.id).toBe(fixture.project.draftRevisionId);
    });

    it('mutation works without token', async () => {
      const result = await gqlQuery({
        app,
        query: gql`
          mutation login($data: LoginInput!) {
            login(data: $data) {
              accessToken
            }
          }
        `,
        variables: {
          data: { emailOrUsername: 'anything', password: 'anything' },
        },
      });

      expect(result.login.accessToken).toBeDefined();
    });
  });

  describe('MCP API', () => {
    it('instructions say no authentication required', async () => {
      const res = await mcpPost(app, null, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });

      const data = parseResponse(res);
      expect(data.result.instructions).toContain('No authentication required');
    });

    it('tools work without login', async () => {
      const sessionId = await initMcpSession(app);

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'get_projects',
          arguments: {
            organizationId: fixture.project.organizationId,
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('get_tables works without login', async () => {
      const sessionId = await initMcpSession(app);

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'get_tables',
          arguments: {
            revisionId: fixture.project.headRevisionId,
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('create_row works without login', async () => {
      const sessionId = await initMcpSession(app);

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'create_row',
          arguments: {
            revisionId: fixture.project.draftRevisionId,
            tableId: fixture.project.tableId,
            rowId: 'no-auth-row',
            data: { ver: 42 },
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
    });

    it('login accepts any credentials', async () => {
      const sessionId = await initMcpSession(app);

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: 'anything',
            password: 'anything',
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.success).toBe(true);
    });
  });
});
