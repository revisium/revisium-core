import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  prepareData,
  prepareDataWithRoles,
  PrepareDataReturnType,
  PrepareDataWithRolesReturnType,
  PrepareProjectUserReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp } from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

interface McpToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

describe('mcp-api - role-based permissions', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
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

  const callMcpTool = async (
    sessionId: string,
    toolName: string,
    args: object,
  ): Promise<{ result?: McpToolResult; error?: { message: string } }> => {
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('mcp-session-id', sessionId)
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

  const initAndLogin = async (
    user: PrepareProjectUserReturnType,
  ): Promise<string> => {
    const initResponse = await request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .buffer(true)
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      });

    const sessionId = initResponse.headers['mcp-session-id'] as string;

    if (!sessionId) {
      throw new Error(
        `No session ID returned. Status: ${initResponse.status}, Headers: ${JSON.stringify(initResponse.headers)}, Body: ${initResponse.text}`,
      );
    }

    await request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('mcp-session-id', sessionId)
      .buffer(true)
      .send({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'login',
          arguments: {
            username: user.user.username,
            password: 'password',
          },
        },
      });

    return sessionId;
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
          text.includes('Not authenticated')
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

    it('should require authentication for protected tools', async () => {
      const initResponse = await request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .buffer(true)
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
        });

      const sessionId = initResponse.headers['mcp-session-id'] as string;

      if (!sessionId) {
        throw new Error(
          `No session ID returned. Status: ${initResponse.status}, Headers: ${JSON.stringify(initResponse.headers)}, Body: ${initResponse.text}`,
        );
      }

      const result = await callMcpTool(sessionId, 'getTables', {
        revisionId: preparedData.project.draftRevisionId,
      });

      expect(getErrorMessage(result)).toMatch(/Not authenticated/);
    });

    it('should allow login and access for owner', async () => {
      const sessionId = await initAndLogin(preparedData.owner);

      const result = await callMcpTool(sessionId, 'getTables', {
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
      const sessionId = await initAndLogin(preparedData.owner);

      const result = await callMcpTool(sessionId, 'getProject', {
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
      const sessionId = await initAndLogin(preparedData.anotherOwner);

      const result = await callMcpTool(sessionId, 'getProject', {
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
      const sessionId = await initAndLogin(preparedData.anotherOwner);

      const result = await callMcpTool(sessionId, 'getProject', {
        organizationId: preparedData.project.organizationId,
        projectName: preparedData.project.projectName,
      });

      expect(isSuccessResult(result)).toBe(true);
    });

    it('another owner cannot write to public project', async () => {
      const sessionId = await initAndLogin(preparedData.anotherOwner);

      const result = await callMcpTool(sessionId, 'createTable', {
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

    describe('createTable', () => {
      it('owner can create table', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'createTable', {
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
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'createTable', {
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
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'createTable', {
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
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'createTable', {
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

    describe('removeTable', () => {
      it('owner can remove table', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'removeTable', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can remove table', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'removeTable', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor cannot remove table', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'removeTable', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Table/,
        );
      });

      it('reader cannot remove table', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'removeTable', {
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
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'getTables', {
          revisionId: fixture.project.draftRevisionId,
        });

        if (!isSuccessResult(result)) {
          console.log(
            'getTables owner result:',
            JSON.stringify(result, null, 2),
          );
        }
        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read tables', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'getTables', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read tables', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'getTables', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read tables', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'getTables', {
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

    describe('createRow', () => {
      it('owner can create row', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'createRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'owner-row',
          data: { ver: 100 },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can create row', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'createRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'dev-row',
          data: { ver: 100 },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can create row', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'createRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'editor-row',
          data: { ver: 100 },
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot create row', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'createRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: 'reader-row',
          data: { ver: 100 },
        });

        expect(getErrorMessage(result)).toMatch(/not allowed to create on Row/);
      });
    });

    describe('removeRow', () => {
      it('owner can remove row', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'removeRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can remove row', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'removeRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can remove row', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'removeRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot remove row', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'removeRow', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
          rowId: fixture.project.rowId,
        });

        expect(getErrorMessage(result)).toMatch(/not allowed to delete on Row/);
      });
    });

    describe('getRows (read access)', () => {
      it('owner can read rows', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'getRows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read rows', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'getRows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read rows', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'getRows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read rows', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'getRows', {
          revisionId: fixture.project.draftRevisionId,
          tableId: fixture.project.tableId,
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

    describe('createBranch', () => {
      it('owner can create branch', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'createBranch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'owner-branch',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can create branch', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'createBranch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'dev-branch',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor cannot create branch', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'createBranch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'editor-branch',
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Branch/,
        );
      });

      it('reader cannot create branch', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'createBranch', {
          revisionId: fixture.project.headRevisionId,
          branchName: 'reader-branch',
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to create on Branch/,
        );
      });
    });

    describe('revertChanges', () => {
      it('owner can revert changes', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'revertChanges', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can revert changes', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'revertChanges', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can revert changes', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'revertChanges', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot revert changes', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'revertChanges', {
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

    describe('commitRevision', () => {
      it('owner can commit revision', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'commitRevision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Owner commit',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can commit revision', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'commitRevision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Developer commit',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can commit revision', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'commitRevision', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
          comment: 'Editor commit',
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader cannot commit revision', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'commitRevision', {
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
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'getRevision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read revision', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'getRevision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read revision', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'getRevision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read revision', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'getRevision', {
          revisionId: fixture.project.draftRevisionId,
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });
  });

  describe('Project Operations - Role-Based', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('deleteProject', () => {
      it('owner can delete project', async () => {
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'deleteProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer cannot delete project', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'deleteProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Project/,
        );
      });

      it('editor cannot delete project', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'deleteProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(getErrorMessage(result)).toMatch(
          /not allowed to delete on Project/,
        );
      });

      it('reader cannot delete project', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'deleteProject', {
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
        const sessionId = await initAndLogin(fixture.owner);

        const result = await callMcpTool(sessionId, 'getProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('developer can read project', async () => {
        const sessionId = await initAndLogin(fixture.developer);

        const result = await callMcpTool(sessionId, 'getProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('editor can read project', async () => {
        const sessionId = await initAndLogin(fixture.editor);

        const result = await callMcpTool(sessionId, 'getProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });

      it('reader can read project', async () => {
        const sessionId = await initAndLogin(fixture.reader);

        const result = await callMcpTool(sessionId, 'getProject', {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        });

        expect(isSuccessResult(result)).toBe(true);
      });
    });
  });
});
