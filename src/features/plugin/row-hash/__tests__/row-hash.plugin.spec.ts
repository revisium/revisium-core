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

describe('row-hash.plugin', () => {
  describe('afterCreateRow', () => {
    it('should not save row-hash', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const data = {
        customHash: 'hash',
      };

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data,
      })) as typeof data;

      expect(result.customHash).toBe('');
    });
  });

  describe('afterUpdateRow', () => {
    it('should not save row-hash', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        customHash: '',
      };

      const data = {
        customHash: 'hash',
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

      expect(result.customHash).toBe('');
    });
  });

  describe('computeRows', () => {
    it('should compute rows', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customHash: '',
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

      expect(result.customHash).toBe(rowDraft.hash);
    });

    it('should not compute rows for system table', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customHash: '',
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

      expect(result.customHash).toBe('');
    });
  });

  describe('afterMigrateRows', () => {
    it('should migrate files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customHash: '2025-05-22T05:59:51.079Z',
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

      expect(result.customHash).toBe('');
    });
  });

  let prismaService: PrismaService;
  let pluginService: PluginService;
  let jsonSchemaStore: JsonSchemaStoreService;

  const setupProjectWithFileSchema = async () => {
    const { headRevisionId, draftRevisionId, schemaTableVersionId } =
      await prepareProject(prismaService);

    const schema = getObjectSchema({
      customHash: getRefSchema(SystemSchemaIds.RowHash),
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
