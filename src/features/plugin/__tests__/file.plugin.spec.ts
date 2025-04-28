import { nanoid } from 'nanoid';
import {
  prepareProject,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file.plugin';
import { PluginService } from 'src/features/plugin/plugin.service';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('file.plugin', () => {
  describe('createRow', () => {
    it('should update files', async () => {
      const { draftRevisionId, tableId, rowId } =
        await setupProjectWithFileSchema();
      const emptyFile = createEmptyFile();
      const data = {
        file: emptyFile,
        files: [emptyFile, emptyFile, emptyFile],
      };

      const result = (await pluginService.createRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
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
      const { draftRevisionId, tableId, rowId } =
        await setupProjectWithFileSchema();
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
        pluginService.createRow({
          revisionId: draftRevisionId,
          tableId,
          rowId,
          data,
        }),
      ).rejects.toThrow('size must have default value = 0');
    });
  });

  let prismaService: PrismaService;
  let pluginService: PluginService;

  const setupProjectWithFileSchema = async () => {
    const { headRevisionId, draftRevisionId, schemaTableVersionId } =
      await prepareProject(prismaService);

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    return { draftRevisionId, tableId: table.tableId, rowId: nanoid() };
  };

  const createEmptyFile = () => ({
    status: '',
    fileId: '',
    url: '',
    filename: '',
    hash: '',
    extension: '',
    mimeType: '',
    size: 0,
    width: 0,
    height: 0,
  });

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginService = result.module.get(PluginService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
