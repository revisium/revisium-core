import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  prepareData,
  prepareDataWithRoles,
  PrepareDataReturnType,
  PrepareDataWithRolesReturnType,
  PrepareProjectUserReturnType,
} from 'src/__tests__/utils/prepareProject';
import { UserSystemRoles } from 'src/features/auth/consts';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';

interface McpToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

describe('mcp-api - role-based permissions', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  const makeProjectPublic = async (projectId: string) => {
    await prismaService.project.update({
      where: { id: projectId },
      data: { isPublic: true },
    });
  };

  const getToken = (user: PrepareProjectUserReturnType) =>
    authService.login({
      username: user.user.username,
      sub: user.user.id,
    });

  const callMcpTool = async (
    token: string,
    toolName: string,
    args: object,
  ): Promise<{ result?: McpToolResult; error?: { message: string } }> => {
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .send({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      });

    if (response.headers['content-type']?.includes('text/event-stream')) {
      const lines = response.text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            return JSON.parse(line.slice(6));
          } catch {
            continue;
          }
        }
      }
    }

    return response.body;
  };

  const parseToolResult = <T>(result: McpToolResult): T => {
    const text = result.content.find((c) => c.type === 'text')?.text || '';
    return JSON.parse(text) as T;
  };

  const getErrorMessage = (result: {
    result?: McpToolResult & { isError?: boolean };
    error?: { message: string };
  }): string | undefined => {
    if (result.error?.message) {
      return result.error.message;
    }
    const text = result.result?.content?.[0]?.text;
    if (text) {
      if ((result.result as { isError?: boolean })?.isError) {
        return text;
      }
      try {
        const parsed = JSON.parse(text);
        if (parsed.error) {
          return parsed.error;
        }
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        if (
          text.includes('Error') ||
          text.includes('not allowed') ||
          text.includes('Unauthorized')
        ) {
          return text;
        }
      }
    }
    return undefined;
  };

  const isSuccessResult = (result: {
    result?: McpToolResult & { isError?: boolean };
    error?: { message: string };
  }): boolean => {
    if (result.error) {
      return false;
    }

    if ((result.result as { isError?: boolean })?.isError) {
      return false;
    }
    return result.result !== undefined && result.result.content !== undefined;
  };

  describe('Authentication', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should return 401 without Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .buffer(true)
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_tables',
            arguments: {
              revisionId: preparedData.project.draftRevisionId,
            },
          },
        });

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toMatch(/^Bearer /);
    });

    it('should allow access for owner with Bearer token', async () => {
      const token = getToken(preparedData.owner);

      const result = await callMcpTool(token, 'get_tables', {
        revisionId: preparedData.project.draftRevisionId,
      });

      expect(isSuccessResult(result)).toBe(true);
    });
  });

  describe('Private Project Access', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can access own project resources', async () => {
      const token = getToken(preparedData.owner);

      const result = await callMcpTool(token, 'get_project', {
        organizationId: preparedData.project.organizationId,
        projectName: preparedData.project.projectName,
      });

      expect(result.result).toBeDefined();
      const project = parseToolResult<{ id: string }>(
        result.result as McpToolResult,
      );
      expect(project.id).toBe(preparedData.project.projectId);
    });

    it('another owner cannot access private project', async () => {
      const token = getToken(preparedData.anotherOwner);

      const result = await callMcpTool(token, 'get_project', {
        organizationId: preparedData.project.organizationId,
        projectName: preparedData.project.projectName,
      });

      expect(getErrorMessage(result)).toMatch(/not allowed to read on Project/);
    });
  });

  describe('Public Project Access', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('another owner can read public project', async () => {
      const token = getToken(preparedData.anotherOwner);

      const result = await callMcpTool(token, 'get_project', {
        organizationId: preparedData.project.organizationId,
        projectName: preparedData.project.projectName,
      });

      expect(isSuccessResult(result)).toBe(true);
    });

    it('another owner cannot write to public project', async () => {
      const token = getToken(preparedData.anotherOwner);

      const result = await callMcpTool(token, 'create_table', {
        revisionId: preparedData.project.draftRevisionId,
        tableId: 'test-table',
        schema: {
          type: 'object',
          properties: { name: { type: 'string', default: '' } },
          required: ['name'],
          additionalProperties: false,
        },
      });

      expect(getErrorMessage(result)).toMatch(/not allowed to create on Table/);
    });
  });

  describe('Table Operations - Role-Based', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('create_table', () => {
      it('owner can create table', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'create_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: 'owner-table',
          schema: {
            type: 'object',
            properties: { name: { type: 'string', default: '' } },
            required: ['name'],
            additionalProperties: false,
          },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can create table', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'create_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: 'dev-table',
          schema: {
            type: 'object',
            properties: { name: { type: 'string', default: '' } },
            required: ['name'],
            additionalProperties: false,
          },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor cannot create table', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'create_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: 'editor-table',
          schema: {
            type: 'object',
            properties: { name: { type: 'string', default: '' } },
            required: ['name'],
            additionalProperties: false,
          },
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Table/,
        );
      });

      it('reader cannot create table', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'create_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: 'reader-table',
          schema: {
            type: 'object',
            properties: { name: { type: 'string', default: '' } },
            required: ['name'],
            additionalProperties: false,
          },
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Table/,
        );
      });
    });

    describe('delete_table', () => {
      it('owner can remove table', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'delete_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can remove table', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'delete_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor cannot remove table', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'delete_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Table/,
        );
      });

      it('reader cannot remove table', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'delete_table', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Table/,
        );
      });
    });

    describe('getTables (read access)', () => {
      it('owner can read tables', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'get_tables', {
          revisionId: fixture.project.draftRevisionId,
        });
        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read tables', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'get_tables', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read tables', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'get_tables', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read tables', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'get_tables', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });
  });

  describe('Row Operations - Role-Based', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('create_row', () => {
      it('owner can create row', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'create_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'owner-row',
          data: { ver: 100 },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can create row', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'create_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'dev-row',
          data: { ver: 100 },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can create row', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'create_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'editor-row',
          data: { ver: 100 },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot create row', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'create_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'reader-row',
          data: { ver: 100 },
        });

        expect(getErrorMessage(result)).toMatch(/not allowed to create on Row/);
      });
    });

    describe('delete_row', () => {
      it('owner can remove row', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'delete_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can remove row', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'delete_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can remove row', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'delete_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot remove row', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'delete_row', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(getErrorMessage(result)).toMatch(/not allowed to delete on Row/);
      });
    });

    describe('getRows (read access)', () => {
      it('owner can read rows', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'get_rows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read rows', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'get_rows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read rows', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'get_rows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read rows', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'get_rows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });

    describe('searchRows (read access)', () => {
      it('owner can search rows', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'search_rows', {
          revisionId: fixture.project.draftRevisionId,
          query: 'test',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can search rows', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'search_rows', {
          revisionId: fixture.project.draftRevisionId,
          query: 'test',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can search rows', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'search_rows', {
          revisionId: fixture.project.draftRevisionId,
          query: 'test',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can search rows', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'search_rows', {
          revisionId: fixture.project.draftRevisionId,
          query: 'test',
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });
  });

  describe('Branch Operations - Role-Based', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('create_branch', () => {
      it('owner can create branch', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'create_branch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'owner-branch',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can create branch', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'create_branch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'dev-branch',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor cannot create branch', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'create_branch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'editor-branch',
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Branch/,
        );
      });

      it('reader cannot create branch', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'create_branch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'reader-branch',
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Branch/,
        );
      });
    });

    describe('revert_changes', () => {
      it('owner can revert changes', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'revert_changes', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can revert changes', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'revert_changes', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can revert changes', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'revert_changes', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot revert changes', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'revert_changes', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to revert on Revision/,
        );
      });
    });
  });

  describe('Revision Operations - Role-Based', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('create_revision', () => {
      it('owner can commit revision', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'create_revision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Owner commit',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can commit revision', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'create_revision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Developer commit',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can commit revision', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'create_revision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Editor commit',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot commit revision', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'create_revision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Reader commit',
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Revision/,
        );
      });
    });

    describe('getRevision (read access)', () => {
      it('owner can read revision', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'get_revision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read revision', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'get_revision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read revision', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'get_revision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read revision', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'get_revision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });
  });

  describe('Organization Operations', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    describe('get_organization', () => {
      it('owner can access own organization', async () => {
        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'get_organization', {
          organizationId: preparedData.project.organizationId,
        });

        expect(isSuccessResult(result)).toBe(true);
        const org = parseToolResult<{ id: string }>(
          result.result as McpToolResult,
        );
        expect(org.id).toBe(preparedData.project.organizationId);
      });

      it('another owner can read organization metadata (public)', async () => {
        const token = getToken(preparedData.anotherOwner);

        const result = await callMcpTool(token, 'get_organization', {
          organizationId: preparedData.project.organizationId,
        });

        expect(isSuccessResult(result)).toBe(true);
        const org = parseToolResult<{ id: string }>(
          result.result as McpToolResult,
        );
        expect(org.id).toBe(preparedData.project.organizationId);
      });

      it('returns 401 without Bearer token', async () => {
        const res = await request(app.getHttpServer())
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json, text/event-stream')
          .buffer(true)
          .send({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'get_organization',
              arguments: {
                organizationId: preparedData.project.organizationId,
              },
            },
          });

        expect(res.status).toBe(401);
      });
    });

    describe('get_projects', () => {
      it('owner can list projects in own organization', async () => {
        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'get_projects', {
          organizationId: preparedData.project.organizationId,
        });

        expect(isSuccessResult(result)).toBe(true);
        const projects = parseToolResult<{ edges: Array<{ node: unknown }> }>(
          result.result as McpToolResult,
        );
        expect(projects.edges).toBeDefined();
        expect(projects.edges.length).toBeGreaterThan(0);
      });

      it('another owner can access organization endpoint but sees filtered results', async () => {
        const token = getToken(preparedData.anotherOwner);

        const result = await callMcpTool(token, 'get_projects', {
          organizationId: preparedData.project.organizationId,
        });

        expect(isSuccessResult(result)).toBe(true);
        const projects = parseToolResult<{ edges: Array<{ node: unknown }> }>(
          result.result as McpToolResult,
        );
        expect(projects.edges).toBeDefined();
      });

      it('owner sees public projects in organization', async () => {
        await makeProjectPublic(preparedData.project.projectId);
        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'get_projects', {
          organizationId: preparedData.project.organizationId,
        });

        expect(isSuccessResult(result)).toBe(true);
        const projects = parseToolResult<{
          edges: Array<{ node: { id: string } }>;
        }>(result.result as McpToolResult);
        expect(projects.edges.length).toBeGreaterThan(0);
        expect(projects.edges[0].node.id).toBe(preparedData.project.projectId);
      });

      it('returns 401 without Bearer token', async () => {
        const res = await request(app.getHttpServer())
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json, text/event-stream')
          .buffer(true)
          .send({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'get_projects',
              arguments: {
                organizationId: preparedData.project.organizationId,
              },
            },
          });

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Project Operations - Role-Based', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('delete_project', () => {
      it('owner can delete project', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'delete_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer cannot delete project', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'delete_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Project/,
        );
      });

      it('editor cannot delete project', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'delete_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Project/,
        );
      });

      it('reader cannot delete project', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'delete_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Project/,
        );
      });
    });

    describe('getProject (read access)', () => {
      it('owner can read project', async () => {
        const token = getToken(fixture.owner);

        const result = await callMcpTool(token, 'get_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read project', async () => {
        const token = getToken(fixture.developer);

        const result = await callMcpTool(token, 'get_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read project', async () => {
        const token = getToken(fixture.editor);

        const result = await callMcpTool(token, 'get_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read project', async () => {
        const token = getToken(fixture.reader);

        const result = await callMcpTool(token, 'get_project', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });
  });

  describe('User Operations', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    describe('admin_get_user', () => {
      it('system admin can get user details', async () => {
        await prismaService.user.update({
          where: { id: preparedData.owner.user.id },
          data: { roleId: UserSystemRoles.systemAdmin },
        });

        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'admin_get_user', {
          userId: preparedData.anotherOwner.user.id,
        });

        expect(isSuccessResult(result)).toBe(true);
        const user = parseToolResult<{ id: string; email: string }>(
          result.result as McpToolResult,
        );
        expect(user.id).toBe(preparedData.anotherOwner.user.id);
        expect(user.email).toBeDefined();
      });

      it('non-admin cannot get user details', async () => {
        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'admin_get_user', {
          userId: preparedData.anotherOwner.user.id,
        });

        expect(getErrorMessage(result)).toMatch(/not allowed to read on User/);
      });

      it('returns 401 without Bearer token', async () => {
        const res = await request(app.getHttpServer())
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json, text/event-stream')
          .buffer(true)
          .send({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'admin_get_user',
              arguments: { userId: preparedData.owner.user.id },
            },
          });

        expect(res.status).toBe(401);
      });
    });

    describe('search_users', () => {
      it('authenticated user can search users', async () => {
        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'search_users', {
          search: preparedData.anotherOwner.user.username,
        });

        expect(isSuccessResult(result)).toBe(true);
        const users = parseToolResult<{
          edges: Array<{ node: { id: string } }>;
        }>(result.result as McpToolResult);
        expect(users.edges).toBeDefined();
      });

      it('can search without query to list users', async () => {
        const token = getToken(preparedData.owner);

        const result = await callMcpTool(token, 'search_users', {
          first: 5,
        });

        expect(isSuccessResult(result)).toBe(true);
        const users = parseToolResult<{ edges: Array<{ node: unknown }> }>(
          result.result as McpToolResult,
        );
        expect(users.edges).toBeDefined();
      });

      it('returns 401 without Bearer token', async () => {
        const res = await request(app.getHttpServer())
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json, text/event-stream')
          .buffer(true)
          .send({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'search_users',
              arguments: { search: 'test' },
            },
          });

        expect(res.status).toBe(401);
      });
    });
  });
});
