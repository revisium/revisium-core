import * as hash from 'object-hash';
import { nanoid } from 'nanoid';
import {
  createExpressFile,
  createExpressImageFile,
} from 'src/__tests__/utils/file';
import {
  createEmptyFile,
  prepareProject,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from '@revisium/schema-toolkit/mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('file.plugin', () => {
  describe('afterCreateRow', () => {
    it('should update files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const emptyFile = createEmptyFile();
      const data = {
        file: emptyFile,
        files: [emptyFile, emptyFile, emptyFile],
      };

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data,
      })) as typeof data;

      expect(result.file.status).toBe(FileStatus.ready);
      expect(result.file.fileId).toBeTruthy();

      for (const file of result.files) {
        expect(file.status).toBe(FileStatus.ready);
        expect(file.fileId).toBeTruthy();
      }
    });

    it('should throw error if the data is invalid', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const emptyFile = createEmptyFile();

      const data = {
        file: emptyFile,
        files: [
          emptyFile,
          {
            ...emptyFile,
            size: 1,
          },
          emptyFile,
        ],
      };

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data,
        }),
      ).rejects.toThrow('size must have default value = 0');
    });
  });

  describe('afterUpdateRow', () => {
    it('should update files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        file: createPreviousFile(),
        files: [createPreviousFile()],
      };

      const data = {
        file: { ...previousData.file, url: 'url', fileName: 'filename' },
        files: [...previousData.files, createEmptyFile(), createEmptyFile()],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      const result = (await pluginService.afterUpdateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: rowDraft.id,
        data,
      })) as typeof data;

      expect(result.file.status).toBe(FileStatus.ready);
      expect(result.file.fileId).toBeTruthy();
      expect(result.file.url).toBe('');
      expect(result.file.fileName).toBe('filename');

      for (const file of result.files) {
        expect(file.status).toBe(FileStatus.ready);
        expect(file.fileId).toBeTruthy();
      }
    });

    it('should throw error if the data is invalid', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        file: createPreviousFile(),
        files: [createPreviousFile()],
      };

      const data = {
        file: { ...previousData.file, size: 100 },
        files: [...previousData.files, createEmptyFile(), createEmptyFile()],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      await expect(
        pluginService.afterUpdateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: rowDraft.id,
          data,
        }),
      ).rejects.toThrow('size must have value = 0');
    });

    it('should throw error if the file does not exist', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        file: createPreviousFile(),
        files: [],
      };

      const data = {
        file: previousData.file,
        files: [createPreviousFile()],
      } as const;

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      await expect(
        pluginService.afterUpdateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: rowDraft.id,
          data,
        }),
      ).rejects.toThrow(`File ${data.files[0].fileId} does not exist`);
    });
  });

  describe('computeRows', () => {
    it('should compute rows', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        file: {
          ...createPreviousFile(),
          status: FileStatus.uploaded,
          url: 'url',
        },
        files: [
          {
            ...createPreviousFile(),
            status: FileStatus.uploaded,
          },
          createPreviousFile(),
          createEmptyFile(),
        ],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: data,
        dataDraft: data,
      });

      await pluginService.computeRows({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rows: [rowDraft],
      });

      const result = rowDraft.data as typeof data;

      expect(result.file.url).toBeTruthy();
      expect(result.files[0].url).toBeTruthy();
      expect(result.files[1].url).toBe('');
      expect(result.files[2].url).toBe('');
    });

    it('should not compute rows for system table', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        file: {
          ...createPreviousFile(),
          status: FileStatus.uploaded,
          url: 'test',
        },
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

      await pluginService.computeRows({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        rows: [rowDraft],
      });

      const result = rowDraft.data as typeof data;

      expect(result.file.url).toBe('test');
    });
  });

  describe('afterMigrateRows', () => {
    it('should migrate files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        file: createPreviousFile(),
        files: [createPreviousFile(), createEmptyFile(), createEmptyFile()],
      } as const;

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: data,
        dataDraft: data,
      });

      await pluginService.afterMigrateRows({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rows: [rowDraft],
      });

      const result = rowDraft.data as unknown as typeof data;

      expect(result.files[1].status).toBe(FileStatus.ready);
      expect(result.files[1].fileId).toBeTruthy();
      expect(result.files[2].status).toBe(FileStatus.ready);
      expect(result.files[2].fileId).toBeTruthy();
    });
  });

  describe('uploadFile', () => {
    it('should upload file', async () => {
      const { table, schemaStore } = await setupProjectWithFileSchema();

      const previousData = {
        file: createPreviousFile(),
        files: [],
      };

      const data = {
        file: { ...previousData.file, url: 'url', fileName: 'filename' },
        files: [],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      const valueStore = createJsonValueStore(schemaStore, '', rowDraft.data);
      const file = createExpressFile();

      await filePlugin.uploadFile({
        valueStore,
        fileId: data.file.fileId,
        file,
      });

      const result = valueStore.getPlainValue() as typeof data;

      expect(result.file.status).toBe(FileStatus.uploaded);
      expect(result.file.fileId).toBe(data.file.fileId);
      expect(result.file.fileName).toBe(file.originalname);
      expect(result.file.mimeType).toBe(file.mimetype);
      expect(result.file.extension).toBe('txt');
      expect(result.file.hash).toBe(hash(file.buffer));
      expect(result.file.url).toBe('');
      expect(result.file.size).toBe(file.size);
      expect(result.file.width).toBe(0);
      expect(result.file.height).toBe(0);
    });

    it('should upload image file', async () => {
      const { table, schemaStore } = await setupProjectWithFileSchema();

      const previousData = {
        file: createPreviousFile(),
        files: [],
      };

      const data = {
        file: { ...previousData.file, url: 'url', fileName: 'filename' },
        files: [],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      const valueStore = createJsonValueStore(schemaStore, '', rowDraft.data);
      const file = createExpressImageFile();

      await filePlugin.uploadFile({
        valueStore,
        fileId: data.file.fileId,
        file,
      });

      const result = valueStore.getPlainValue() as typeof data;

      expect(result.file.status).toBe(FileStatus.uploaded);
      expect(result.file.fileId).toBe(data.file.fileId);
      expect(result.file.fileName).toBe(file.originalname);
      expect(result.file.mimeType).toBe(file.mimetype);
      expect(result.file.extension).toBe('png');
      expect(result.file.hash).toBe(hash(file.buffer));
      expect(result.file.url).toBe('');
      expect(result.file.size).toBe(file.size);
      expect(result.file.width).toBe(420);
      expect(result.file.height).toBe(420);
    });

    it('should throw error if file not found', async () => {
      const { table, schemaStore } = await setupProjectWithFileSchema();

      const previousData = {
        file: createPreviousFile(),
        files: [],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      await expect(
        filePlugin.uploadFile({
          valueStore: createJsonValueStore(schemaStore, '', rowDraft.data),
          fileId: 'unrealId',
          file: createExpressImageFile(),
        }),
      ).rejects.toThrow(`Invalid count of files`);
    });

    it('should throw error if there is same id', async () => {
      const { table, schemaStore } = await setupProjectWithFileSchema();

      const file = createPreviousFile();

      const previousData = {
        file: file,
        files: [file],
      };

      const { rowDraft } = await prepareRow({
        prismaService,
        headTableVersionId: table.headTableVersionId,
        draftTableVersionId: table.draftTableVersionId,
        schema: table.schema,
        data: previousData,
        dataDraft: previousData,
      });

      await expect(
        filePlugin.uploadFile({
          valueStore: createJsonValueStore(schemaStore, '', rowDraft.data),
          fileId: file.fileId,
          file: createExpressImageFile(),
        }),
      ).rejects.toThrow(`Invalid count of files`);
    });
  });

  let prismaService: PrismaService;
  let pluginService: PluginService;
  let filePlugin: FilePlugin;
  let jsonSchemaStore: JsonSchemaStoreService;

  const setupProjectWithFileSchema = async () => {
    const {
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = await prepareProject(prismaService);

    const schema = getObjectSchema({
      file: getRefSchema(SystemSchemaIds.File),
      files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
    });

    const schemaStore = jsonSchemaStore.create(schema);

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema,
    });

    return { draftRevisionId, table, schema, schemaStore };
  };

  const createPreviousFile = () => {
    const file = createEmptyFile();
    file.status = FileStatus.ready;
    file.fileId = nanoid();
    return file;
  };

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginService = result.module.get(PluginService);
    filePlugin = result.module.get(FilePlugin);
    jsonSchemaStore = result.module.get(JsonSchemaStoreService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
