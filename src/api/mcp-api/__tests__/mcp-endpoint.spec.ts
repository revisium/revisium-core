import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { prepareData } from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';

interface McpToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

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

  return req.buffer(true).send(body);
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

const getToolResultJson = (result: McpToolResult) => {
  const text = result.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

describe('mcp-api - endpoint tools', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupTest = async () => {
    // Note: prepareData/prepareProject automatically creates 2 endpoints:
    // - REST_API on headRevision (headEndpointId)
    // - GRAPHQL on draftRevision (draftEndpointId)
    const testData = await prepareData(app);

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
    const sessionId = initRes.headers['mcp-session-id'] as string;

    await mcpPost(app, sessionId, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'login',
        arguments: {
          username: testData.owner.user.username,
          password: 'password',
        },
      },
    });

    const callTool = async (
      toolName: string,
      args: object,
    ): Promise<{ result?: McpToolResult; error?: { message: string } }> => {
      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      });
      return parseResponse(res);
    };

    return { testData, sessionId, callTool };
  };

  describe('tools/list includes endpoint tools', () => {
    it('should list endpoint tools', async () => {
      const { sessionId } = await setupTest();

      const res = await mcpPost(app, sessionId, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {},
      });

      const data = parseResponse(res);
      const toolNames = data.result.tools.map((t: { name: string }) => t.name);

      expect(toolNames).toContain('get_project_endpoints');
      expect(toolNames).toContain('get_endpoint_relatives');
      expect(toolNames).toContain('create_endpoint');
      expect(toolNames).toContain('delete_endpoint');
      expect(toolNames).toContain('get_graphql_schema');
      expect(toolNames).toContain('get_openapi_spec');
    });
  });

  describe('get_project_endpoints', () => {
    it('should return pre-existing endpoints from prepareData', async () => {
      const { testData, callTool } = await setupTest();

      const response = await callTool('get_project_endpoints', {
        organizationId: testData.project.organizationId,
        projectName: testData.project.projectName,
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      // prepareData creates 2 endpoints: REST_API on head, GRAPHQL on draft
      expect(result.totalCount).toBe(2);
      const types = result.edges.map(
        (e: { node: { type: string } }) => e.node.type,
      );
      expect(types).toContain('REST_API');
      expect(types).toContain('GRAPHQL');
    });

    it('should return endpoints filtered by type', async () => {
      const { testData, callTool } = await setupTest();

      const response = await callTool('get_project_endpoints', {
        organizationId: testData.project.organizationId,
        projectName: testData.project.projectName,
        type: 'GRAPHQL',
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.totalCount).toBe(1);
      expect(result.edges[0].node.type).toBe('GRAPHQL');
    });
  });

  describe('create_endpoint', () => {
    it('should fail to create duplicate endpoint on same revision', async () => {
      const { testData, callTool } = await setupTest();

      // headRevision already has REST_API endpoint from prepareData
      const response = await callTool('create_endpoint', {
        revisionId: testData.project.headRevisionId,
        type: 'REST_API',
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.error).toContain('Endpoint already has been created');
    });

    it('should create endpoint of different type on same revision', async () => {
      const { testData, callTool } = await setupTest();

      // headRevision has REST_API, so we can create GRAPHQL
      const response = await callTool('create_endpoint', {
        revisionId: testData.project.headRevisionId,
        type: 'GRAPHQL',
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.error).toBeUndefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('GRAPHQL');
    });
  });

  describe('get_endpoint_relatives', () => {
    it('should return endpoint with related entities', async () => {
      const { testData, callTool } = await setupTest();

      // Use pre-existing endpoint from prepareData
      const endpointId = testData.project.headEndpointId;

      const response = await callTool('get_endpoint_relatives', {
        endpointId,
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.endpoint.id).toBe(endpointId);
      expect(result.revision).toBeDefined();
      expect(result.branch).toBeDefined();
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe(testData.project.projectName);
    });
  });

  describe('delete_endpoint', () => {
    it('should delete endpoint', async () => {
      const { testData, callTool } = await setupTest();

      // Use pre-existing endpoint from prepareData
      const endpointId = testData.project.headEndpointId;

      const deleteResponse = await callTool('delete_endpoint', {
        endpointId,
      });

      expect(deleteResponse.result).toBeDefined();
      const result = getToolResultJson(deleteResponse.result!);
      expect(result.success).toBe(true);

      // After deleting one, should have 1 endpoint left
      const listResponse = await callTool('get_project_endpoints', {
        organizationId: testData.project.organizationId,
        projectName: testData.project.projectName,
      });
      const listResult = getToolResultJson(listResponse.result!);
      expect(listResult.totalCount).toBe(1);
    });
  });

  describe('get_graphql_schema', () => {
    it('should return error for REST_API endpoint', async () => {
      const { testData, callTool } = await setupTest();

      // Use pre-existing REST_API endpoint on head revision
      const endpointId = testData.project.headEndpointId;

      const response = await callTool('get_graphql_schema', {
        endpointId,
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.error).toContain('not GRAPHQL');
    });

    it('should return fetch error when endpoint service is not available', async () => {
      const { testData, callTool } = await setupTest();

      // Use pre-existing GRAPHQL endpoint on draft revision
      const endpointId = testData.project.draftEndpointId;

      const response = await callTool('get_graphql_schema', {
        endpointId,
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.error).toBeDefined();
      expect(result.url).toContain('/endpoint/graphql/');
    });
  });

  describe('get_openapi_spec', () => {
    it('should return error for GRAPHQL endpoint', async () => {
      const { testData, callTool } = await setupTest();

      // Use pre-existing GRAPHQL endpoint on draft revision
      const endpointId = testData.project.draftEndpointId;

      const response = await callTool('get_openapi_spec', {
        endpointId,
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.error).toContain('not REST_API');
    });

    it('should return fetch error when endpoint service is not available', async () => {
      const { testData, callTool } = await setupTest();

      // Use pre-existing REST_API endpoint on head revision
      const endpointId = testData.project.headEndpointId;

      const response = await callTool('get_openapi_spec', {
        endpointId,
      });

      expect(response.result).toBeDefined();
      const result = getToolResultJson(response.result!);
      expect(result.error).toBeDefined();
      expect(result.url).toContain('/endpoint/openapi/');
      expect(result.url).toContain('/openapi.json');
    });
  });
});
