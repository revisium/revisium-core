import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { getTestApp } from 'src/testing/e2e';
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
    app = await getTestApp();
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

    it('get_table with URI works', async () => {
      const data = await callTool(app, token, 'get_table', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe(fixture.project.tableId);
    });

    it('get_table_schema with URI works', async () => {
      const data = await callTool(app, token, 'get_table_schema', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.type || content.properties).toBeDefined();
    });

    it('get_table_changes with URI works', async () => {
      const data = await callTool(app, token, 'get_table_changes', {
        uri: shortUri(),
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(Array.isArray(content.edges)).toBe(true);
    });

    it('get_row_changes with URI works', async () => {
      const data = await callTool(app, token, 'get_row_changes', {
        uri: shortUri(),
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(Array.isArray(content.edges)).toBe(true);
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

  describe('compact mutation responses', () => {
    it('create_row returns compact { id }', async () => {
      const data = await callTool(app, token, 'create_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'compact-test',
        data: { ver: 42 },
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe('compact-test');
      expect(content.versionId).toBeUndefined();
      expect(content.hash).toBeUndefined();
      expect(content.data).toBeUndefined();
    });

    it('create_rows returns compact { rows: [{ id }] }', async () => {
      const data = await callTool(app, token, 'create_rows', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rows: [
          { rowId: 'compact-bulk-1', data: { ver: 1 } },
          { rowId: 'compact-bulk-2', data: { ver: 2 } },
        ],
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.rows).toHaveLength(2);
      expect(content.rows[0].id).toBe('compact-bulk-1');
      expect(content.rows[0].versionId).toBeUndefined();
      expect(content.rows[0].data).toBeUndefined();
    });

    it('patch_row returns compact { id }', async () => {
      await callTool(app, token, 'create_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'patch-compact',
        data: { ver: 1 },
      });

      const data = await callTool(app, token, 'patch_row', {
        uri: shortUri(),
        tableId: fixture.project.tableId,
        rowId: 'patch-compact',
        patches: [{ op: 'replace', path: 'ver', value: 99 }],
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.id).toBe('patch-compact');
      expect(content.data).toBeUndefined();
    });
  });

  describe('get_tables enrichment', () => {
    it('get_tables with includeSchema returns schemas', async () => {
      const data = await callTool(app, token, 'get_tables', {
        uri: shortUri(),
        includeSchema: true,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges.length).toBeGreaterThan(0);
      const table = content.edges[0].node;
      expect(table.schema).toBeDefined();
      expect(table.schema.type).toBe('object');
      expect(table.schema.properties).toBeDefined();
    });

    it('get_tables with includeRowCount returns counts', async () => {
      const data = await callTool(app, token, 'get_tables', {
        uri: shortUri(),
        includeRowCount: true,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.edges.length).toBeGreaterThan(0);
      expect(typeof content.edges[0].node.rowCount).toBe('number');
    });

    it('get_tables with both includeSchema and includeRowCount', async () => {
      const data = await callTool(app, token, 'get_tables', {
        uri: shortUri(),
        includeSchema: true,
        includeRowCount: true,
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      const table = content.edges[0].node;
      expect(table.schema).toBeDefined();
      expect(typeof table.rowCount).toBe('number');
    });
  });

  describe('create_table with rows', () => {
    it('creates table and rows in one call', async () => {
      const tableId = `table-with-rows-${Date.now()}`;
      const data = await callTool(app, token, 'create_table', {
        uri: shortUri(),
        tableId,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', default: '' },
          },
          additionalProperties: false,
          required: ['name'],
        },
        rows: [
          { rowId: 'row-1', data: { name: 'First' } },
          { rowId: 'row-2', data: { name: 'Second' } },
        ],
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.tableId).toBe(tableId);
      expect(content.rowsCreated).toBe(2);

      // Verify rows exist
      const rowsData = await callTool(app, token, 'get_rows', {
        uri: shortUri(),
        tableId,
      });
      const rowsContent = JSON.parse(rowsData.result.content[0].text);
      expect(rowsContent.totalCount).toBe(2);
    });

    it('returns table even if rows fail', async () => {
      const tableId = `table-rows-fail-${Date.now()}`;
      const data = await callTool(app, token, 'create_table', {
        uri: shortUri(),
        tableId,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', default: '' },
          },
          additionalProperties: false,
          required: ['name'],
        },
        rows: [{ rowId: 'bad-row', data: { nonexistent: 'field' } }],
      });

      expect(data.result.isError).toBeFalsy();
      const content = JSON.parse(data.result.content[0].text);
      expect(content.tableId).toBe(tableId);
      expect(content.rowsError).toBeDefined();
    });
  });

  describe('auto-fill formula defaults', () => {
    it('create_row without formula field succeeds', async () => {
      const tableId = `formula-auto-${Date.now()}`;
      await callTool(app, token, 'create_table', {
        uri: shortUri(),
        tableId,
        schema: {
          type: 'object',
          properties: {
            price: { type: 'number', default: 0 },
            quantity: { type: 'number', default: 0 },
            total: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'price * quantity' },
            },
          },
          additionalProperties: false,
          required: ['price', 'quantity', 'total'],
        },
      });

      // Create row WITHOUT passing "total" — should auto-fill
      const data = await callTool(app, token, 'create_row', {
        uri: shortUri(),
        tableId,
        rowId: 'auto-fill-test',
        data: { price: 25, quantity: 4 },
      });

      expect(data.result.isError).toBeFalsy();

      // Verify formula computed correctly
      const rowData = await callTool(app, token, 'get_row', {
        uri: shortUri(),
        tableId,
        rowId: 'auto-fill-test',
      });
      const row = JSON.parse(rowData.result.content[0].text);
      expect(row.data.total).toBe(100);
      expect(row.data.price).toBe(25);
      expect(row.data.quantity).toBe(4);
    });

    it('create_rows without formula fields succeeds', async () => {
      const tableId = `formula-auto-bulk-${Date.now()}`;
      await callTool(app, token, 'create_table', {
        uri: shortUri(),
        tableId,
        schema: {
          type: 'object',
          properties: {
            a: { type: 'number', default: 0 },
            b: { type: 'number', default: 0 },
            sum: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'a + b' },
            },
          },
          additionalProperties: false,
          required: ['a', 'b', 'sum'],
        },
      });

      const data = await callTool(app, token, 'create_rows', {
        uri: shortUri(),
        tableId,
        rows: [
          { rowId: 'r1', data: { a: 10, b: 20 } },
          { rowId: 'r2', data: { a: 3, b: 7 } },
        ],
      });

      expect(data.result.isError).toBeFalsy();

      const r1 = await callTool(app, token, 'get_row', {
        uri: shortUri(),
        tableId,
        rowId: 'r1',
      });
      expect(JSON.parse(r1.result.content[0].text).data.sum).toBe(30);

      const r2 = await callTool(app, token, 'get_row', {
        uri: shortUri(),
        tableId,
        rowId: 'r2',
      });
      expect(JSON.parse(r2.result.content[0].text).data.sum).toBe(10);
    });
  });
});
