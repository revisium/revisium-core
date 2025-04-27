import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
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
      const { draftRevisionId, tableId, schemaRowVersionId } =
        await prepareProject(prismaService);

      await prismaService.row.update({
        where: { versionId: schemaRowVersionId },
        data: {
          data: getObjectSchema({
            file: getRefSchema(SystemSchemaIds.File),
            files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
          }),
        },
      });

      const rowId = nanoid();

      const file = {
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
      };

      const data = { file, files: [file, file, file] } as const;

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
      const { draftRevisionId, tableId, schemaRowVersionId } =
        await prepareProject(prismaService);

      await prismaService.row.update({
        where: { versionId: schemaRowVersionId },
        data: {
          data: getObjectSchema({
            file: getRefSchema(SystemSchemaIds.File),
            files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
          }),
        },
      });

      const rowId = nanoid();

      const file = {
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
      };

      const data = {
        file,
        files: [
          file,
          {
            ...file,
            size: 1,
          },
          file,
        ],
      } as const;

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

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginService = result.module.get(PluginService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
