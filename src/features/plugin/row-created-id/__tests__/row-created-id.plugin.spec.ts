import { nanoid } from 'nanoid';
import {
  prepareProject,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import { getObjectSchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('row-created-id.plugin', () => {
  describe('afterCreateRow', () => {
    it('should not save row-created-id', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();
      const data = {
        customCreatedId: 'id',
      };

      const result = (await pluginService.afterCreateRow({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: nanoid(),
        data,
      })) as typeof data;

      expect(result.customCreatedId).toBe('');
    });
  });

  describe('afterUpdateRow', () => {
    it('should not save row-created-id', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const previousData = {
        customCreatedId: '',
      };

      const data = {
        customCreatedId: 'id',
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

      expect(result.customCreatedId).toBe('');
    });
  });

  describe('computeRows', () => {
    it('should compute rows', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customCreatedId: '',
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

      expect(result.customCreatedId).toBe(rowDraft.createdId);
    });

    it('should not compute rows for system table', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customCreatedId: '',
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

      expect(result.customCreatedId).toBe('');
    });
  });

  describe('afterMigrateRows', () => {
    it('should migrate files', async () => {
      const { draftRevisionId, table } = await setupProjectWithFileSchema();

      const data = {
        customCreatedId: 'id',
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

      expect(result.customCreatedId).toBe('');
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
      customCreatedId: getRefSchema(SystemSchemaIds.RowCreatedId),
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
