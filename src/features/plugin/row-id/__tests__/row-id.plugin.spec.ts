import { nanoid } from 'nanoid';
import {
  prepareProject,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getObjectSchema,
  getRefSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('row-id.plugin', () => {
  describe('afterCreateRow', () => {
    it('should not save row-id', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const data = {
        customId: 'id',
      };

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data,
      })) as typeof data;

      expect(result.customId).toBe('');
    });
  });

  describe('afterUpdateRow', () => {
    it('should not save row-id', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        customId: '',
      };

      const data = {
        customId: 'id',
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

      expect(result.customId).toBe('');
    });
  });

  describe('computeRows', () => {
    it('should compute rows', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customId: '',
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

      expect(result.customId).toBe(rowDraft.id);
    });

    it('should not compute rows for system table', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customId: '',
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

      expect(result.customId).toBe('');
    });
  });

  describe('afterMigrateRows', () => {
    it('should migrate files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customId: 'id',
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

      expect(result.customId).toBe('');
    });
  });

  let prismaService: PrismaService;
  let pluginService: PluginService;
  let jsonSchemaStore: JsonSchemaStoreService;

  const setupProjectWithFileSchema = async () => {
    const { headRevisionId, draftRevisionId, schemaTableVersionId } =
      await prepareProject(prismaService);

    const schema = getObjectSchema({
      customId: getRefSchema(SystemSchemaIds.RowId),
    });

    const schemaStore = jsonSchemaStore.create(schema);

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      schema,
    });

    return { draftRevisionId, table, schema, schemaStore };
  };

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    pluginService = result.module.get(PluginService);
    jsonSchemaStore = result.module.get(JsonSchemaStoreService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
