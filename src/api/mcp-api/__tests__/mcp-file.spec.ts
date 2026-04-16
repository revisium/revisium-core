import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  createEmptyFile,
  prepareData,
  PrepareDataReturnType,
  prepareRow,
  prepareTableWithSchema,
} from 'src/testing/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { CoreModule } from 'src/core/core.module';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { STORAGE_SERVICE } from 'src/infrastructure/storage/storage.interface';
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

describe('MCP API - File Tools', () => {
  let app: INestApplication;
  let authService: AuthService;
  let preparedData: PrepareDataReturnType;
  let token: string;
  let tableId: string;
  let rowId: string;
  let fileId: string;

  beforeAll(async () => {
    const mockStorage = {
      isAvailable: true,
      canServeFiles: false,
      uploadFile: jest.fn().mockResolvedValue({
        key: 'uploads/test-file',
      }),
      getPublicUrl: jest.fn((key: string) => `http://test-files/${key}`),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({
          mode: 'monolith',
          storage: mockStorage as any,
        }),
      ],
    })
      .overrideProvider(STORAGE_SERVICE)
      .useValue(mockStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    authService = app.get(AuthService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    preparedData = await prepareData(app);

    const { draftRevisionId, projectId, branchName } = preparedData.project;

    const table = await prepareTableWithSchema(app, {
      projectId,
      branchName,
      draftRevisionId,
      schema: getObjectSchema({
        title: getStringSchema(),
        document: getRefSchema(SystemSchemaIds.File),
        attachments: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const data = {
      title: 'Test Document',
      document: createEmptyFile(),
      attachments: [],
    };

    const rowResult = await prepareRow(app, {
      projectId,
      branchName,
      draftRevisionId: table.draftRevisionId,
      tableId: table.tableId,
      data,
      dataDraft: data,
    });
    const { rowDraft } = rowResult;

    tableId = table.tableId;
    rowId = rowDraft.id;
    fileId = (rowDraft.data as { document: { fileId: string } }).document
      .fileId;
    preparedData.project.headRevisionId = rowResult.headRevisionId;
    preparedData.project.draftRevisionId = rowResult.draftRevisionId;
    preparedData.project.tableId = table.tableId;
    preparedData.project.rowId = rowDraft.id;

    token = authService.login({
      username: preparedData.owner.user.username,
      sub: preparedData.owner.user.id,
    });
  });

  describe('tools/list', () => {
    it('should include uploadFile tool', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/list',
          params: {},
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      const toolNames = data.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('upload_file');
    });
  });

  describe('resources/list', () => {
    it('should include file specification resource', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/list',
          params: {},
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.resources).toContainEqual(
        expect.objectContaining({
          uri: 'revisium://specs/file',
          name: 'file-specification',
        }),
      );
    });
  });

  describe('resources/read file specification', () => {
    it('should read file specification with examples', async () => {
      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/read',
          params: { uri: 'revisium://specs/file' },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.contents).toBeDefined();
      expect(data.result.contents[0].mimeType).toBe('application/json');

      const content = JSON.parse(data.result.contents[0].text);
      expect(content.fileSchema).toBeDefined();
      expect(content.fileStatuses).toBeDefined();
      expect(content.uploadWorkflow).toBeDefined();
      expect(content.queryingFiles).toBeDefined();
    });
  });

  describe('uploadFile tool', () => {
    it('should upload file with base64 data', async () => {
      const fileContent = 'Hello, this is a test file content';
      const base64Data = Buffer.from(fileContent).toString('base64');

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'upload_file',
            arguments: {
              revisionId: preparedData.project.draftRevisionId,
              tableId,
              rowId,
              fileId,
              fileName: 'test-document.txt',
              mimeType: 'text/plain',
              fileData: base64Data,
            },
          },
        },
        token,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.content).toBeDefined();

      const content = JSON.parse(data.result.content[0].text);
      expect(content.row).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await mcpPost(app, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'upload_file',
          arguments: {
            revisionId: preparedData.project.draftRevisionId,
            tableId,
            rowId,
            fileId,
            fileName: 'test.txt',
            mimeType: 'text/plain',
            fileData: Buffer.from('test').toString('base64'),
          },
        },
      }).expect(401);

      expect(res.headers['www-authenticate']).toMatch(/^Bearer /);
    });

    it('should fail when another user tries to upload', async () => {
      const anotherToken = authService.login({
        username: preparedData.anotherOwner.user.username,
        sub: preparedData.anotherOwner.user.id,
      });

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'upload_file',
            arguments: {
              revisionId: preparedData.project.draftRevisionId,
              tableId,
              rowId,
              fileId,
              fileName: 'test.txt',
              mimeType: 'text/plain',
              fileData: Buffer.from('test').toString('base64'),
            },
          },
        },
        anotherToken,
      ).expect(200);

      const data = parseResponse(res);
      expect(data.result.content[0].text).toContain('not allowed');
    });

    it('should reject file exceeding size limit (base64 decoded)', async () => {
      const base64Data = Buffer.alloc(51 * 1024 * 1024).toString('base64');

      const res = await mcpPost(
        app,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'upload_file',
            arguments: {
              revisionId: preparedData.project.draftRevisionId,
              tableId,
              rowId,
              fileId,
              fileName: 'large-file.bin',
              mimeType: 'application/octet-stream',
              fileData: base64Data,
            },
          },
        },
        token,
      );

      expect(res.status).toBe(413);
    });
  });
});
