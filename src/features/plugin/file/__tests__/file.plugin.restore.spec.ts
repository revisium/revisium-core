import { nanoid } from 'nanoid';
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
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createValidFileData,
  createReadyFileData,
  createTestData,
  runValidationTest,
  validationTestScenarios,
  uploadedFileConsistencyScenarios,
} from './file-restore.test-utils';

describe('file.plugin restore mode', () => {
  let prismaService: PrismaService;
  let pluginService: PluginService;
  let _filePlugin: FilePlugin;
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

  describe('afterCreateRow with isRestore=true', () => {
    it('should validate and accept valid restore data', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const validFileData = createValidFileData();
      const data = createTestData(validFileData);

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data: data as any,
        isRestore: true,
      })) as any;

      expect(result.file.status).toBe(FileStatus.uploaded);
      expect(result.file.fileId).toBe(validFileData.fileId);
      expect(result.file.hash).toBe(validFileData.hash);
      expect(result.file.url).toBe('');
    });

    it('should validate and accept ready status files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const readyFileData = createReadyFileData();
      const data = createTestData(readyFileData);

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data: data as any,
        isRestore: true,
      })) as any;

      expect(result.file.status).toBe(FileStatus.ready);
      expect(result.file.fileId).toBe(readyFileData.fileId);
      expect(result.file.url).toBe('');
    });

    it('should throw error for invalid fileId format', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const invalidFileData = createReadyFileData({ fileId: 'invalid-id' });
      const data = createTestData(invalidFileData);

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data: data as any,
          isRestore: true,
        }),
      ).rejects.toThrow(
        'Invalid fileId format - must be nanoid (21 URL-safe characters)',
      );
    });

    it('should throw error for duplicate fileIds', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const duplicateFileId = nanoid();
      const fileData = createReadyFileData({ fileId: duplicateFileId });
      const data = createTestData(fileData, [fileData]);

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data: data as any,
          isRestore: true,
        }),
      ).rejects.toThrow(
        `Duplicate fileId found: ${duplicateFileId}. FileId must be unique within a row`,
      );
    });

    it('should throw error for uploaded file without required fields', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const incompleteFileData = createValidFileData({
        hash: '',
        mimeType: '',
        size: 0,
      });
      const data = createTestData(incompleteFileData);

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data: data as any,
          isRestore: true,
        }),
      ).rejects.toThrow('hash is required when status is uploaded');
    });

    it('should throw error for invalid hash format', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const invalidHashData = createValidFileData({
        hash: 'invalid-hash-format',
      });
      const data = createTestData(invalidHashData);

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data: data as any,
          isRestore: true,
        }),
      ).rejects.toThrow(
        'Invalid hash format - must be MD5, SHA-1, SHA-256, or SHA-512',
      );
    });

    it('should throw error for invalid file dimensions', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const invalidDimensionsData = createValidFileData({
        width: -100,
      });
      const data = createTestData(invalidDimensionsData);

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data: data as any,
          isRestore: true,
        }),
      ).rejects.toThrow('width must be a non-negative integer');
    });

    it('should throw error for non-image file with dimensions', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const nonImageWithDimensions = createValidFileData({
        mimeType: 'application/pdf',
        extension: 'pdf',
        width: 100,
        height: 100,
      });
      const data = createTestData(nonImageWithDimensions);

      await expect(
        pluginService.afterCreateRow({
          revisionId: draftRevisionId,
          tableId: table.tableId,
          rowId: nanoid(),
          data: data as any,
          isRestore: true,
        }),
      ).rejects.toThrow('width and height must be 0 for non-image files');
    });
  });

  describe('afterUpdateRow with isRestore=true', () => {
    it('should validate restore data for update', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const validFileData = createValidFileData();
      const data = createTestData(validFileData);

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
        data: data as any,
        isRestore: true,
      })) as any;

      expect(result.file.status).toBe(FileStatus.uploaded);
      expect(result.file.fileId).toBe(validFileData.fileId);
      expect(result.file.url).toBe('');
    });
  });

  describe('validation edge cases', () => {
    const testValidation = async (data: any, isRestore: boolean) => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      return pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data: data as any,
        isRestore,
      });
    };

    // Test all validation scenarios using the utility function
    validationTestScenarios.forEach((scenario) => {
      it(`should throw error for ${scenario.name}`, async () => {
        await runValidationTest(testValidation, scenario);
      });
    });

    // Test uploaded file consistency scenarios
    uploadedFileConsistencyScenarios.forEach((scenario) => {
      it(`should throw error when ${scenario.name}`, async () => {
        await runValidationTest(
          testValidation,
          scenario,
          createValidFileData(),
        );
      });
    });
  });

  describe('valid MIME types', () => {
    const validMimeTypes = [
      // Test MIME types with special characters: "+", ".", "-"
      { mimeType: 'image/svg+xml', extension: 'svg', fileName: 'image.svg' },
      {
        mimeType: 'application/vnd.ms-excel',
        extension: 'xls',
        fileName: 'spreadsheet.xls',
        width: 0,
        height: 0,
      },
      {
        mimeType: 'font/woff2',
        extension: 'woff2',
        fileName: 'font.woff2',
        width: 0,
        height: 0,
      },
    ];

    validMimeTypes.forEach(
      ({ mimeType, extension, fileName, width, height }) => {
        it(`should accept ${mimeType} MIME type`, async () => {
          const { draftRevisionId, table } = await setupProjectWithFileSchema();
          const validFileData = createValidFileData({
            mimeType,
            extension,
            fileName,
            ...(width !== undefined && { width }),
            ...(height !== undefined && { height }),
          });
          const data = createTestData(validFileData);

          const result = (await pluginService.afterCreateRow({
            revisionId: draftRevisionId,
            tableId: table.tableId,
            rowId: nanoid(),
            data: data as any,
            isRestore: true,
          })) as any;

          expect(result.file.mimeType).toBe(mimeType);
          expect(result.file.status).toBe(FileStatus.uploaded);
        });
      },
    );
  });

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginService = result.module.get(PluginService);
    _filePlugin = result.module.get(FilePlugin);
    jsonSchemaStore = result.module.get(JsonSchemaStoreService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
