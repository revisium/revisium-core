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

describe('MCP API', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  const getToken = (user: { username: string | null; id: string }) =>
    authService.login({ username: user.username, sub: user.id });

  describe('initialize', () => {
    it('should initialize MCP server', async () => {
      const fixture = await prepareData(app);
      const token = getToken(fixture.owner.user);

      const res = await mcpPost(
        app,
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
        token,
      ).expect(200);

      expect(res.headers['mcp-session-id']).toBeUndefined();

      const data = parseResponse(res);
      expect(data.result).toMatchObject({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'revisium', version: expect.any(String) },
        capabilities: expect.objectContaining({
          resources: expect.any(Object),
          tools: expect.any(Object),
        }),
      });
    });

    it('should reject request without Accept header', async () => {
      const fixture = await prepareData(app);
      const token = getToken(fixture.owner.user);

      await request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${token}`)
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

    it('should return 401 without Bearer token', async () => {
      const res = await mcpPost(app, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }).expect(401);

      expect(res.headers['www-authenticate']).toMatch(/^Bearer /);
      expect(res.headers['www-authenticate']).toContain('scope="mcp"');
      expect(res.body.error.message).toBe('Unauthorized');
    });
  });

  describe('tools/list', () => {
    it('should list all available tools', async () => {
      const fixture = await prepareData(app);
      const token = getToken(fixture.owner.user);

      const res = await mcpPost(
        app,
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
        token,
      );

      const initData = parseResponse(res);
      expect(initData.result).toBeDefined();

      const listRes = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        },
        token,
      ).expect(200);

      const data = parseResponse(listRes);
      expect(data.result.tools).toBeDefined();
      expect(Array.isArray(data.result.tools)).toBe(true);

      const toolNames = data.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).not.toContain('login');
      expect(toolNames).not.toContain('login_with_token');
      expect(toolNames).not.toContain('me');
      expect(toolNames).toContain('get_organization');
      expect(toolNames).toContain('get_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).toContain('create_project');
      expect(toolNames).toContain('get_branch');
      expect(toolNames).toContain('get_tables');
      expect(toolNames).toContain('create_table');
      expect(toolNames).toContain('get_rows');
      expect(toolNames).toContain('search_rows');
      expect(toolNames).toContain('create_row');
      expect(toolNames).toContain('create_rows');
      expect(toolNames).toContain('update_rows');
      expect(toolNames).toContain('patch_rows');
      expect(toolNames).toContain('delete_rows');
      expect(toolNames).toContain('create_revision');
      expect(toolNames).toContain('upload_file');
      expect(toolNames).toContain('get_branches');
      expect(toolNames).toContain('get_revisions');
      expect(toolNames).toContain('delete_branch');
      expect(toolNames).toContain('count_rows');
      expect(toolNames).toContain('get_parent_revision');
      expect(toolNames).toContain('update_project');
      expect(toolNames).toContain('get_row_foreign_keys_by');
    });
  });

  describe('resources/list', () => {
    it('should list schema specification resource', async () => {
      const fixture = await prepareData(app);
      const token = getToken(fixture.owner.user);

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/list',
          params: {},
        },
        token,
      ).expect(200);

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
    it('should read schema specification', async () => {
      const fixture = await prepareData(app);
      const token = getToken(fixture.owner.user);

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/read',
          params: { uri: 'revisium://specs/schema' },
        },
        token,
      ).expect(200);

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

  describe('tools/call - CRUD operations', () => {
    let fixture: PrepareDataReturnType;
    let token: string;

    beforeEach(async () => {
      fixture = await prepareData(app);
      token = getToken(fixture.owner.user);
    });

    it('should get branch', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_branch',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              branchName: fixture.project.branchName,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe(fixture.project.branchId);
      expect(content.name).toBe(fixture.project.branchName);
      expect(content.headRevisionId).toBe(fixture.project.headRevisionId);
      expect(content.draftRevisionId).toBe(fixture.project.draftRevisionId);
    });

    it('should create revision and return committed head', async () => {
      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_row',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowId: 'commit-test-row',
              data: { ver: 1 },
            },
          },
        },
        token,
      );

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'create_revision',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              branchName: fixture.project.branchName,
              comment: 'test commit',
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.isHead).toBe(true);
      expect(content.isDraft).toBe(false);
      expect(content.comment).toBe('test commit');
    });

    it('should get tables', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_tables',
            arguments: { revisionId: fixture.project.headRevisionId },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('should get rows from table', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_rows',
            arguments: {
              revisionId: fixture.project.headRevisionId,
              tableId: fixture.project.tableId,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
    });

    it('should search rows across tables (compact mode)', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'search_rows',
            arguments: {
              revisionId: fixture.project.headRevisionId,
              query: fixture.project.rowId,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
      if (content.edges.length > 0) {
        expect(content.edges[0].node.row).toEqual({
          id: fixture.project.rowId,
        });
        expect(content.edges[0].node.table).toEqual({
          id: fixture.project.tableId,
        });
        expect(content.edges[0].node.matches).toBeDefined();
        expect(content.edges[0].node.row.data).toBeUndefined();
      }
    });

    it('should search rows with full data (includeRowData)', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'search_rows',
            arguments: {
              revisionId: fixture.project.headRevisionId,
              query: fixture.project.rowId,
              includeRowData: true,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
      if (content.edges.length > 0) {
        expect(content.edges[0].node.row.id).toBe(fixture.project.rowId);
        expect(content.edges[0].node.row.data).toBeDefined();
        expect(content.edges[0].node.table.id).toBe(fixture.project.tableId);
      }
    });

    it('should get revision', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_revision',
            arguments: { revisionId: fixture.project.headRevisionId },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe(fixture.project.headRevisionId);
    });

    it('should create multiple rows with create_rows', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rows: [
                { rowId: 'bulk-row-1', data: { ver: 1 } },
                { rowId: 'bulk-row-2', data: { ver: 2 } },
              ],
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.rows).toHaveLength(2);
    });

    it('should update multiple rows with update_rows', async () => {
      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rows: [
                { rowId: 'update-row-1', data: { ver: 1 } },
                { rowId: 'update-row-2', data: { ver: 2 } },
              ],
            },
          },
        },
        token,
      );

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'update_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rows: [
                { rowId: 'update-row-1', data: { ver: 100 } },
                { rowId: 'update-row-2', data: { ver: 200 } },
              ],
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.rows).toHaveLength(2);
    });

    it('should patch multiple rows with patch_rows', async () => {
      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rows: [
                { rowId: 'patch-row-1', data: { ver: 1 } },
                { rowId: 'patch-row-2', data: { ver: 2 } },
              ],
            },
          },
        },
        token,
      );

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'patch_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rows: [
                {
                  rowId: 'patch-row-1',
                  patches: [{ op: 'replace', path: 'ver', value: 100 }],
                },
                {
                  rowId: 'patch-row-2',
                  patches: [{ op: 'replace', path: 'ver', value: 200 }],
                },
              ],
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.rows).toHaveLength(2);
    });

    it('should remove multiple rows with delete_rows', async () => {
      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rows: [
                { rowId: 'remove-row-1', data: { ver: 1 } },
                { rowId: 'remove-row-2', data: { ver: 2 } },
              ],
            },
          },
        },
        token,
      );

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'delete_rows',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowIds: ['remove-row-1', 'remove-row-2'],
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
    });

    it('should get branches', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_branches',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
      expect(content.edges.length).toBeGreaterThanOrEqual(1);
      expect(content.edges[0].node.name).toBe(fixture.project.branchName);
    });

    it('should get revisions', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_revisions',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              branchName: fixture.project.branchName,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
      expect(content.edges.length).toBeGreaterThanOrEqual(1);
    });

    it('should count rows', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'count_rows',
            arguments: {
              revisionId: fixture.project.headRevisionId,
              tableId: fixture.project.tableId,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(typeof content.count).toBe('number');
    });

    it('should get parent revision', async () => {
      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_row',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowId: 'parent-rev-test-row',
              data: { ver: 1 },
            },
          },
        },
        token,
      );

      const commitRes = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'create_revision',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              branchName: fixture.project.branchName,
            },
          },
        },
        token,
      );

      const commitData = parseResponse(commitRes);
      const newRevision = JSON.parse(commitData.result.content[0].text);

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'get_parent_revision',
            arguments: { revisionId: newRevision.id },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.parent).toBeDefined();
      expect(content.parent.id).toBe(fixture.project.headRevisionId);
    });

    it('should return null for root revision parent', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_parent_revision',
            arguments: { revisionId: fixture.project.headRevisionId },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.parent).toBeNull();
    });

    it('should update project', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'update_project',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              isPublic: true,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content).toBe(true);
    });

    it('should get row foreign keys by', async () => {
      const childTableId = `fk-child-${Date.now()}`;

      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_table',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: childTableId,
              schema: {
                type: 'object',
                properties: {
                  parentRef: {
                    type: 'string',
                    default: '',
                    foreignKey: fixture.project.tableId,
                  },
                },
                additionalProperties: false,
                required: ['parentRef'],
              },
            },
          },
        },
        token,
      ).expect(200);

      const parentRowId = `fk-parent-${Date.now()}`;

      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'create_row',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowId: parentRowId,
              data: { ver: 1 },
            },
          },
        },
        token,
      ).expect(200);

      await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'create_row',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: childTableId,
              rowId: 'fk-test-child',
              data: { parentRef: parentRowId },
            },
          },
        },
        token,
      ).expect(200);

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'get_row_foreign_keys_by',
            arguments: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowId: parentRowId,
              foreignKeyByTableId: childTableId,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges).toBeDefined();
      expect(
        content.edges.some(
          (e: { node: { id: string } }) => e.node.id === 'fk-test-child',
        ),
      ).toBe(true);
    });

    it('should delete branch', async () => {
      const branchName = `branch-to-delete-${Date.now()}`;

      const createRes = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_branch',
            arguments: {
              revisionId: fixture.project.headRevisionId,
              branchName,
            },
          },
        },
        token,
      ).expect(200);

      const createData = parseResponse(createRes);
      expect(createData.result.isError).toBeFalsy();

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'delete_branch',
            arguments: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
              branchName,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content).toBe(true);
    });
  });

  describe('GET /mcp', () => {
    it('should return 405', async () => {
      const res = await request(app.getHttpServer())
        .get('/mcp')
        .set('Accept', 'application/json, text/event-stream')
        .expect(405);

      expect(res.body.error.message).toContain('SSE not supported');
    });
  });

  describe('DELETE /mcp', () => {
    it('should return 405', async () => {
      const res = await request(app.getHttpServer())
        .delete('/mcp')
        .set('Accept', 'application/json, text/event-stream')
        .expect(405);

      expect(res.body.error.message).toContain(
        'Session management not supported',
      );
    });
  });
});
