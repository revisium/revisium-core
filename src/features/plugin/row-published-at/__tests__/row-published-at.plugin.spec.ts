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
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { RowPublishedAtPlugin } from '../row-published-at.plugin';

describe('row-published-at.plugin', () => {
  describe('afterCreateRow', () => {
    it('should not save row-published-at', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const data = {
        customPublishedAt: '2025-05-22T05:59:51.079Z',
      };

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data,
      })) as typeof data;

      expect(result.customPublishedAt).toBe('');
    });
  });

  describe('afterUpdateRow', () => {
    it('should not save row-published-at', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        customPublishedAt: '',
      };

      const data = {
        customPublishedAt: '2025-05-22T05:59:51.079Z',
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

      expect(result.customPublishedAt).toBe('');
    });
  });

  describe('computeRows', () => {
    it('should compute rows', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customPublishedAt: '',
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

      expect(result.customPublishedAt).toBe(rowDraft.publishedAt.toISOString());
    });

    it('should not compute rows for system table', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customPublishedAt: '',
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

      expect(result.customPublishedAt).toBe('');
    });
  });

  describe('afterMigrateRows', () => {
    it('should migrate files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customPublishedAt: '2025-05-22T05:59:51.079Z',
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

      expect(result.customPublishedAt).toBe('');
    });
  });

  describe('getPublishedAt', () => {
    let rowPublishedAtPlugin: RowPublishedAtPlugin;
    let jsonSchemaStore: JsonSchemaStoreService;

    beforeAll(async () => {
      const result = await createTestingModule();
      rowPublishedAtPlugin = result.module.get(RowPublishedAtPlugin);
      jsonSchemaStore = result.module.get(JsonSchemaStoreService);
    });

    it('should return undefined when no publishedAt fields exist', async () => {
      const schema = getObjectSchema({});
      const valueStore = createJsonValueStore(
        jsonSchemaStore.create(schema),
        '',
        {},
      );

      const result = rowPublishedAtPlugin.getPublishedAt(valueStore);
      expect(result).toBeUndefined();
    });

    it('should return publishedAt value when it exists', async () => {
      const schema = getObjectSchema({
        customPublishedAt: getRefSchema(SystemSchemaIds.RowPublishedAt),
      });
      const publishedAt = '2025-05-22T05:59:51.079Z';

      const valueStore = createJsonValueStore(
        jsonSchemaStore.create(schema),
        '',
        { customPublishedAt: publishedAt },
      );

      const result = rowPublishedAtPlugin.getPublishedAt(valueStore);
      expect(result).toBe(publishedAt);
    });

    it('should return first publishedAt value when multiple existо', async () => {
      const schema = getObjectSchema({
        customPublishedAt1: getRefSchema(SystemSchemaIds.RowPublishedAt),
        customPublishedAt2: getRefSchema(SystemSchemaIds.RowPublishedAt),
      });
      const firstPublishedAt = '2025-05-22T05:59:51.079Z';

      const valueStore = createJsonValueStore(
        jsonSchemaStore.create(schema),
        '',
        {
          customPublishedAt1: firstPublishedAt,
          customPublishedAt2: '2025-05-23T05:59:51.079Z',
        },
      );

      const result = rowPublishedAtPlugin.getPublishedAt(valueStore);
      expect(result).toBe(firstPublishedAt);
    });

    it('should return undefined when publishedAt field is null', async () => {
      const schema = getObjectSchema({
        customPublishedAt: getRefSchema(SystemSchemaIds.RowPublishedAt),
      });

      const valueStore = createJsonValueStore(
        jsonSchemaStore.create(schema),
        '',
        { customPublishedAt: null },
      );

      const result = rowPublishedAtPlugin.getPublishedAt(valueStore);
      expect(result).toBeUndefined();
    });
  });

  let prismaService: PrismaService;
  let pluginService: PluginService;
  let jsonSchemaStore: JsonSchemaStoreService;

  const setupProjectWithFileSchema = async () => {
    const {
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = await prepareProject(prismaService);

    const schema = getObjectSchema({
      customPublishedAt: getRefSchema(SystemSchemaIds.RowPublishedAt),
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
