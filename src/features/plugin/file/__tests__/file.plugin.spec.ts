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
} from 'src/__tests__/utils/schema/schema.mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
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

  describe('restore mode', () => {
    describe('afterCreateRow with isRestore=true', () => {
      it('should validate and accept valid restore data', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const validFileData = {
          status: FileStatus.uploaded,
          fileId: nanoid(), // 21 chars nanoid format
          url: 'https://example.com/file.jpg',
          fileName: 'test-image.jpg',
          hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', // 64 chars SHA-256
          extension: 'jpg',
          mimeType: 'image/jpeg',
          size: 102400,
          width: 800,
          height: 600,
        };

        const data = {
          file: validFileData,
          files: [],
        };

        const result = (await pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data,
          isRestore: true,
        })) as typeof data;

        expect(result.file.status).toBe(FileStatus.uploaded);
        expect(result.file.fileId).toBe(validFileData.fileId);
        expect(result.file.hash).toBe(validFileData.hash);
        expect(result.file.url).toBe('');
      });

      it('should validate and accept ready status files', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const validFileData = {
          status: FileStatus.ready,
          fileId: nanoid(),
          url: '',
          fileName: '',
          hash: '',
          extension: '',
          mimeType: '',
          size: 0,
          width: 0,
          height: 0,
        };

        const data = {
          file: validFileData,
          files: [],
        };

        const result = (await pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data,
          isRestore: true,
        })) as typeof data;

        expect(result.file.status).toBe(FileStatus.ready);
        expect(result.file.fileId).toBe(validFileData.fileId);
        expect(result.file.url).toBe('');
      });

      it('should throw error for invalid fileId format', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const invalidFileData = {
          status: FileStatus.ready,
          fileId: 'invalid-id',
          url: '',
          fileName: '',
          hash: '',
          extension: '',
          mimeType: '',
          size: 0,
          width: 0,
          height: 0,
        };

        const data = {
          file: invalidFileData,
          files: [],
        };

        await expect(
          pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data,
            isRestore: true,
          }),
        ).rejects.toThrow(
          'Invalid fileId format - must be nanoid (21 URL-safe characters)',
        );
      });

      it('should throw error for duplicate fileIds', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const duplicateFileId = nanoid();
        const fileData = {
          status: FileStatus.ready,
          fileId: duplicateFileId,
          url: '',
          fileName: '',
          hash: '',
          extension: '',
          mimeType: '',
          size: 0,
          width: 0,
          height: 0,
        };

        const data = {
          file: fileData,
          files: [fileData],
        };

        await expect(
          pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data,
            isRestore: true,
          }),
        ).rejects.toThrow(
          `Duplicate fileId found: ${duplicateFileId}. FileId must be unique within a row`,
        );
      });

      it('should throw error for uploaded file without required fields', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const incompleteFileData = {
          status: FileStatus.uploaded,
          fileId: nanoid(),
          url: '',
          fileName: '',
          hash: '',
          extension: '',
          mimeType: '',
          size: 0,
          width: 0,
          height: 0,
        };

        const data = {
          file: incompleteFileData,
          files: [],
        };

        await expect(
          pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data,
            isRestore: true,
          }),
        ).rejects.toThrow('hash is required when status is uploaded');
      });

      it('should throw error for invalid hash format', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const invalidHashData = {
          status: FileStatus.uploaded,
          fileId: nanoid(),
          url: 'https://example.com/file.jpg',
          fileName: 'test.jpg',
          hash: 'invalid-hash-format',
          extension: 'jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          width: 100,
          height: 100,
        };

        const data = {
          file: invalidHashData,
          files: [],
        };

        await expect(
          pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data,
            isRestore: true,
          }),
        ).rejects.toThrow(
          'Invalid hash format - must be MD5, SHA-1, SHA-256, or SHA-512',
        );
      });

      it('should throw error for invalid file dimensions', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const invalidDimensionsData = {
          status: FileStatus.uploaded,
          fileId: nanoid(),
          url: 'https://example.com/file.jpg',
          fileName: 'test.jpg',
          hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
          extension: 'jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          width: -100,
          height: 100,
        };

        const data = {
          file: invalidDimensionsData,
          files: [],
        };

        await expect(
          pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data,
            isRestore: true,
          }),
        ).rejects.toThrow('width must be a non-negative integer');
      });

      it('should throw error for non-image file with dimensions', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const nonImageWithDimensions = {
          status: FileStatus.uploaded,
          fileId: nanoid(),
          url: 'https://example.com/file.pdf',
          fileName: 'document.pdf',
          hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
          extension: 'pdf',
          mimeType: 'application/pdf',
          size: 1024,
          width: 100,
          height: 100,
        };

        const data = {
          file: nonImageWithDimensions,
          files: [],
        };

        await expect(
          pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data,
            isRestore: true,
          }),
        ).rejects.toThrow('width and height must be 0 for non-image files');
      });
    });

    describe('afterUpdateRow with isRestore=true', () => {
      it('should validate restore data for update', async () => {
        const { draftRevisionId, table } = await setupProjectWithFileSchema();

        const validFileData = {
          status: FileStatus.uploaded,
          fileId: nanoid(),
          url: 'https://example.com/updated.jpg',
          fileName: 'updated-image.jpg',
          hash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2c3d4',
          extension: 'jpg',
          mimeType: 'image/jpeg',
          size: 204800,
          width: 1024,
          height: 768,
        };

        const data = {
          file: validFileData,
          files: [],
        };

        // Create row first for update test
        const { rowDraft } = await prepareRow({
          prismaService,
          headTableVersionId: table.headTableVersionId,
          draftTableVersionId: table.draftTableVersionId,
          schema: table.schema,
          data: { file: createEmptyFile(), files: [] },
          dataDraft: { file: createEmptyFile(), files: [] },
        });

        const result = (await pluginService.afterUpdateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: rowDraft.id,
          data,
          isRestore: true,
        })) as typeof data;

        expect(result.file.status).toBe(FileStatus.uploaded);
        expect(result.file.fileId).toBe(validFileData.fileId);
        expect(result.file.url).toBe('');
      });
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
