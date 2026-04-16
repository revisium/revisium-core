import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createExpressImageFile } from 'src/testing/utils/file';
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
} from '@revisium/schema-toolkit/mocks';
import { CoreModule } from 'src/core/core.module';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { STORAGE_SERVICE } from 'src/infrastructure/storage/storage.interface';
import request from 'supertest';

describe('restapi - row - upload file', () => {
  let preparedData: PrepareDataReturnType;
  let fileId: string;
  let tableId: string;
  let rowId: string;
  let file: Express.Multer.File;

  it('owner can perform uploading', async () => {
    const result = await request(app.getHttpServer())
      .post(getUrl(fileId))
      .attach('file', file.buffer, file.originalname)
      .set('Authorization', `Bearer ${preparedData.owner.token}`)
      .expect(201)
      .then((res) => res.body);

    expect(result).toBeTruthy();
  });

  it('another owner cannot perform patching', async () => {
    return request(app.getHttpServer())
      .post(getUrl(fileId))
      .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
      .expect(/You are not allowed to read on Project/);
  });

  function getUrl(fileId: string) {
    const { draftRevisionId } = preparedData.project;
    return `/api/revision/${draftRevisionId}/tables/${tableId}/rows/${rowId}/upload/${fileId}`;
  }

  let app: INestApplication;

  beforeAll(async () => {
    const mockStorage = {
      isAvailable: true,
      canServeFiles: false,
      uploadFile: jest.fn().mockResolvedValue({
        key: 'uploads/fake.png',
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
    await app.init();

    await prepare();
  });

  afterAll(async () => {
    await app.close();
  });

  async function prepare() {
    preparedData = await prepareData(app);

    const { draftRevisionId, projectId, branchName } = preparedData.project;

    const table = await prepareTableWithSchema(app, {
      projectId,
      branchName,
      draftRevisionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const data = {
      file: createEmptyFile(),
      files: [],
    };

    const rowResult = await prepareRow(app, {
      projectId,
      branchName,
      draftRevisionId: table.draftRevisionId,
      tableId: table.tableId,
      data: data,
      dataDraft: data,
    });
    const { rowDraft } = rowResult;

    tableId = table.tableId;
    rowId = rowDraft.id;
    fileId = (rowDraft.data as { file: { fileId: string } }).file.fileId;
    preparedData.project.headRevisionId = rowResult.headRevisionId;
    preparedData.project.draftRevisionId = rowResult.draftRevisionId;
    preparedData.project.tableId = table.tableId;
    preparedData.project.rowId = rowDraft.id;
    file = createExpressImageFile();
  }
});
