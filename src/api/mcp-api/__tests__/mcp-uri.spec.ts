import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { AuthService } from 'src/features/auth/auth.service';

const mcpPost = (app: INestApplication, body: object, token?: string) => {
  const req = request(app.getHttpServer())
    .post('/mcp')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream');

  if (token) {
    req.set('Authorization', `Bearer ${token}`);
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

const callTool = async (
  app: INestApplication,
  token: string,
  name: string,
  args: Record<string, unknown>,
) => {
  const res = await mcpPost(
    app,
    {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'tools/call',
      params: { name, arguments: args },
    },
    token,
  ).expect(200);

  return parseResponse(res);
};

describe('MCP URI parameter', () => {
  let app: INestApplication;
  let authService: AuthService;
  let fixture: PrepareDataReturnType;
  let token: string;

  beforeAll(async () => {
    app = await createFreshTestApp();
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    fixture = await prepareData(app);
    token = authService.login({
      username: fixture.owner.user.username,
      sub: fixture.owner.user.id,
    });
  });

  const shortUri = () =>
    `${fixture.project.organizationId}/${fixture.project.projectName}/${fixture.project.branchName}`;

  const fullUri = () =>
    `revisium://localhost/${fixture.project.organizationId}/${fixture.project.projectName}/${fixture.project.branchName}`;

  describe('read tools with short-form URI', () => {
    it('get_rows with URI (defaults to draft)', async () => {
      const data = await callTool(app, token, 'get_rows', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('get_rows with URI :head resolves to head revision', async () => {
      const data = await callTool(app, token, 'get_rows', {
        uri: `${shortUri()}:head`,
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('get_tables with URI works', async () => {
      const data = await callTool(app, token, 'get_tables', {
        uri: shortUri(),
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('search_rows with URI works', async () => {
      await callTool(app, token, 'create_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'uri-search-test',
        data: { ver: 9999 },
      });

      const data = await callTool(app, token, 'search_rows', {
        uri: shortUri(),
        query: '9999',
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges.length).toBeGreaterThan(0);
    });

    it('get_revision_changes with URI works', async () => {
      const data = await callTool(app, token, 'get_revision_changes', {
        uri: shortUri(),
      });

      expect(data.result.isError).toBeFalsy();
    });

    it('count_rows with URI works', async () => {
      const data = await callTool(app, token, 'count_rows', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(typeof content.count).toBe('number');
    });
  });

  describe('read tools with full URI', () => {
    it('get_rows with full revisium:// URI', async () => {
      const data = await callTool(app, token, 'get_rows', {
        uri: fullUri(),
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });
  });

  describe('mutation tools with URI', () => {
    it('create_row with draft URI works', async () => {
      const data = await callTool(app, token, 'create_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'uri-created-row',
        data: { ver: 42 },
      });

      expect(data.result.isError).toBeFalsy();
    });

    it('create_row with explicit :draft works', async () => {
      const data = await callTool(app, token, 'create_row', {
        uri: `${shortUri()}:draft`,
        tableId: fixture.project.tableId,
        rowId: 'uri-draft-row',
        data: { ver: 43 },
      });

      expect(data.result.isError).toBeFalsy();
    });

    it('create_row with :head URI returns error', async () => {
      const data = await callTool(app, token, 'create_row', {
        uri: `${shortUri()}:head`,
        tableId: fixture.project.tableId,
        rowId: 'should-fail',
        data: { ver: 1 },
      });

      expect(data.result.isError).toBe(true);
      expect(data.result.content[0].text).toContain(
        'Mutations are only allowed on draft revision',
      );
    });

    it('create_table with URI works', async () => {
      const data = await callTool(app, token, 'create_table', {
        uri: shortUri(),
        tableId: `uri-table-${Date.now()}`,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', default: '' },
          },
          additionalProperties: false,
          required: ['name'],
        },
      });

      expect(data.result.isError).toBeFalsy();
    });

    it('delete_row with URI works', async () => {
      await callTool(app, token, 'create_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'uri-to-delete',
        data: { ver: 1 },
      });

      const data = await callTool(app, token, 'delete_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'uri-to-delete',
      });

      expect(data.result.isError).toBeFalsy();
    });
  });

  describe('validation', () => {
    it('returns error when both revisionId and uri provided', async () => {
      const data = await callTool(app, token, 'get_rows', {
        revisionId: fixture.project.draftRevisionId,
        uri: shortUri(),
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBe(true);
      expect(data.result.content[0].text).toContain(
        'Provide either "revisionId" or "uri", not both',
      );
    });

    it('returns error when neither revisionId nor uri provided', async () => {
      const data = await callTool(app, token, 'get_rows', {
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBe(true);
      expect(data.result.content[0].text).toContain(
        'Either "revisionId" or "uri" is required',
      );
    });

    it('returns error for invalid URI format', async () => {
      const data = await callTool(app, token, 'get_rows', {
        uri: 'invalid',
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBe(true);
      expect(data.result.content[0].text).toContain('Invalid Revisium URI');
    });
  });

  describe('backwards compatibility', () => {
    it('get_rows with revisionId still works', async () => {
      const data = await callTool(app, token, 'get_rows', {
        revisionId: fixture.project.headRevisionId,
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('create_row with revisionId still works', async () => {
      const data = await callTool(app, token, 'create_row', {
        revisionId: fixture.project.draftRevisionId,
        tableId: fixture.project.tableId,
        rowId: 'legacy-row',
        data: { ver: 1 },
      });

      expect(data.result.isError).toBeFalsy();
    });
  });
});
