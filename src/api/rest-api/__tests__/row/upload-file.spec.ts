import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createExpressImageFile } from 'src/__tests__/utils/file';
import {
  createPreviousFile,
  prepareData,
  PrepareDataReturnType,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from '@revisium/schema-toolkit/mocks';
import { CoreModule } from 'src/core/core.module';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { STORAGE_SERVICE } from 'src/infrastructure/storage/storage.interface';
import request from 'supertest';

describe('restapi - row - upload file', () => {
  let preparedData: PrepareDataReturnType;
  let prismaService: PrismaService;
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
    prismaService = app.get(PrismaService);
    await app.init();

    await prepare();
  });

  afterAll(async () => {
    await app.close();
  });

  async function prepare() {
    preparedData = await prepareData(app);

    const {
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = preparedData.project;

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const data = {
      file: createPreviousFile(),
      files: [],
    };

    const { rowDraft } = await prepareRow({
      prismaService,
      headTableVersionId: table.headTableVersionId,
      draftTableVersionId: table.draftTableVersionId,
      schema: table.schema,
      data: data,
      dataDraft: data,
    });

    tableId = table.tableId;
    rowId = rowDraft.id;
    fileId = data.file.fileId;
    file = createExpressImageFile();
  }
});
