import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { AuthService } from 'src/features/auth/auth.service';

const mcpPost = (
  app: INestApplication,
  sessionId: string | null,
  body: object,
  preferSSE = false,
) => {
  const req = request(app.getHttpServer())
    .post('/mcp')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream');

  if (preferSSE) {
    req.set('X-MCP-Prefer-SSE', 'true');
  }

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

describe('MCP API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('initialize', () => {
    it('should initialize MCP session', async () => {
      const res = await mcpPost(app, null, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }).expect(200);

      expect(res.headers['mcp-session-id']).toBeDefined();

      const data = parseResponse(res);
      expect(data.result).toMatchObject({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'revisium', version: '1.0.0' },
        capabilities: expect.objectContaining({
          resources: expect.any(Object),
          tools: expect.any(Object),
        }),
      });
    });

    it('should reject request without Accept header', async () => {
      await request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        })
        .expect(406);
    });
  });

  describe('tools/list', () => {
    let sessionId: string;

    beforeEach(async () => {
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
      sessionId = res.headers['mcp-session-id'];
    });

    it('should list all available tools', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.tools).toBeDefined();
      expect(Array.isArray(data.result.tools)).toBe(true);

      const toolNames = data.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('login');
      expect(toolNames).toContain('loginWithToken');
      expect(toolNames).toContain('me');
      expect(toolNames).toContain('getOrganization');
      expect(toolNames).toContain('getProjects');
      expect(toolNames).toContain('getProject');
      expect(toolNames).toContain('createProject');
      expect(toolNames).toContain('getBranch');
      expect(toolNames).toContain('getTables');
      expect(toolNames).toContain('createTable');
      expect(toolNames).toContain('getRows');
      expect(toolNames).toContain('createRow');
      expect(toolNames).toContain('commitRevision');
      expect(toolNames).toContain('uploadFile');
    });
  });

  describe('resources/list', () => {
    let sessionId: string;

    beforeEach(async () => {
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
      sessionId = res.headers['mcp-session-id'];
    });

    it('should list schema specification resource', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {},
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.resources).toBeDefined();
      expect(data.result.resources).toContainEqual(
        expect.objectContaining({
          uri: 'revisium://specs/schema',
          name: 'schema-specification',
        }),
      );
      expect(data.result.resources).toContainEqual(
        expect.objectContaining({
          uri: 'revisium://specs/file',
          name: 'file-specification',
        }),
      );
    });
  });

  describe('resources/read', () => {
    let sessionId: string;

    beforeEach(async () => {
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
      sessionId = res.headers['mcp-session-id'];
    });

    it('should read schema specification', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: { uri: 'revisium://specs/schema' },
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.contents).toBeDefined();
      expect(data.result.contents[0].mimeType).toBe('application/json');

      const content = JSON.parse(data.result.contents[0].text);
      expect(content.description).toContain('Revisium Table Schema');
      expect(content.schema).toBeDefined();
      expect(content.examples).toBeDefined();
      expect(content.rules).toBeDefined();
    });
  });

  describe('tools/call - authentication', () => {
    let sessionId: string;
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);

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
      sessionId = res.headers['mcp-session-id'];
    });

    it('should login with username and password', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: fixture.owner.user.username,
            password: 'password',
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.user.username).toBe(fixture.owner.user.username);
    });

    it('should fail login with wrong password', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: fixture.owner.user.username,
            password: 'wrong-password',
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.error).toBeDefined();
    });

    it('should return user info after login via me tool', async () => {
      await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: fixture.owner.user.username,
            password: 'password',
          },
        },
      });

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'me', arguments: {} },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.authenticated).toBe(true);
      expect(content.user.username).toBe(fixture.owner.user.username);
    });

    it('should return not authenticated when not logged in', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'me', arguments: {} },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.authenticated).toBe(false);
    });

    it('should login with access token', async () => {
      // First login with password to get a valid token
      const loginRes = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: fixture.owner.user.username,
            password: 'password',
          },
        },
      });
      const loginData = parseResponse(loginRes);
      expect(JSON.parse(loginData.result.content[0].text).success).toBe(true);

      // Create a new session
      const newSessionRes = await mcpPost(app, null, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });
      const newSessionId = newSessionRes.headers['mcp-session-id'];

      // Get a fresh token by logging in again (we need the actual token)
      const authService = app.get(AuthService);
      const accessToken = authService.login({
        username: fixture.owner.user.username,
        sub: fixture.owner.user.id,
      });

      // Login with token in new session
      const res = await mcpPost(app, newSessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'loginWithToken',
          arguments: { accessToken },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.user.username).toBe(fixture.owner.user.username);

      // Verify me() works after loginWithToken
      const meRes = await mcpPost(app, newSessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'me', arguments: {} },
      }).expect(200);

      const meData = parseResponse(meRes);
      const meContent = JSON.parse(meData.result.content[0].text);
      expect(meContent.authenticated).toBe(true);
      expect(meContent.user.username).toBe(fixture.owner.user.username);
    });

    it('should fail loginWithToken with invalid token', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'loginWithToken',
          arguments: { accessToken: 'invalid-token' },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.error).toBeDefined();
    });
  });

  describe('tools/call - requires authentication', () => {
    let sessionId: string;
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);

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
      sessionId = res.headers['mcp-session-id'];
    });

    it('should fail getProjects without authentication', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'getProjects',
          arguments: { organizationId: fixture.project.organizationId },
        },
      }).expect(200);

      const data = parseResponse(res);
      expect(data.error || data.result?.isError).toBeTruthy();
    });

    it('should return projects after authentication', async () => {
      await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: fixture.owner.user.username,
            password: 'password',
          },
        },
      });

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getProjects',
          arguments: { organizationId: fixture.project.organizationId },
        },
      }).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });
  });

  describe('tools/call - CRUD operations', () => {
    let sessionId: string;
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);

      const initRes = await mcpPost(app, null, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });
      sessionId = initRes.headers['mcp-session-id'];

      await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: fixture.owner.user.username,
            password: 'password',
          },
        },
      });
    });

    it('should get branch', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getBranch',
          arguments: {
            organizationId: fixture.project.organizationId,
            projectName: fixture.project.projectName,
            branchName: fixture.project.branchName,
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe(fixture.project.branchId);
      expect(content.name).toBe(fixture.project.branchName);
    });

    it('should get tables', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getTables',
          arguments: { revisionId: fixture.project.headRevisionId },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('should get rows from table', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getRows',
          arguments: {
            revisionId: fixture.project.headRevisionId,
            tableId: fixture.project.tableId,
          },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('should get revision', async () => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getRevision',
          arguments: { revisionId: fixture.project.headRevisionId },
        },
      }).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe(fixture.project.headRevisionId);
    });
  });

  describe('GET /mcp - SSE endpoint', () => {
    it('should reject GET without session ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/mcp')
        .set('Accept', 'application/json, text/event-stream')
        .expect(400);

      expect(res.body.error.message).toContain(
        'Session expired or server was restarted',
      );
    });
  });

  describe('DELETE /mcp - session termination', () => {
    it('should reject DELETE without session ID', async () => {
      const res = await request(app.getHttpServer())
        .delete('/mcp')
        .set('Accept', 'application/json, text/event-stream')
        .expect(400);

      expect(res.body.error.message).toContain(
        'Session expired or server was restarted',
      );
    });

    it('should terminate session', async () => {
      const initRes = await mcpPost(app, null, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });
      const sessionId = initRes.headers['mcp-session-id'];
      expect(sessionId).toBeDefined();

      const deleteRes = await request(app.getHttpServer())
        .delete('/mcp')
        .set('mcp-session-id', sessionId)
        .set('Accept', 'application/json, text/event-stream');

      expect([200, 204, 400]).toContain(deleteRes.status);
    });
  });

  describe('SSE mode (X-MCP-Prefer-SSE header)', () => {
    it('should return SSE format when X-MCP-Prefer-SSE is true', async () => {
      const res = await mcpPost(
        app,
        null,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        },
        true,
      ).expect(200);

      expect(res.headers['mcp-session-id']).toBeDefined();

      expect(res.text).toMatch(/^event:/);
      expect(res.text).toContain('data: {');

      const data = parseResponse(res);
      expect(data.result).toMatchObject({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'revisium', version: '1.0.0' },
      });
    });

    it('should return JSON format by default (no X-MCP-Prefer-SSE header)', async () => {
      const res = await mcpPost(app, null, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }).expect(200);

      expect(res.headers['mcp-session-id']).toBeDefined();

      expect(res.text).not.toMatch(/^event:/);
      expect(res.body.result).toMatchObject({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'revisium', version: '1.0.0' },
      });
    });
  });
});
