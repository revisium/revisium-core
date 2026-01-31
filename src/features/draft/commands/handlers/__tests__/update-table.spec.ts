import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareBranch,
  prepareProject,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import { getArraySchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { tableViewsSchema } from 'src/features/share/schema/table-views-schema';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { UpdateTableViewsCommand } from 'src/features/views/commands/impl';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TableApiService } from 'src/features/table/table-api.service';
import {
  ViewsMigrationService,
  ViewsMigrationError,
} from 'src/features/share/views-migration.service';
import { TableViewsData } from 'src/features/views/types';
import objectHash from 'object-hash';
import {
  FormulaService,
  FormulaValidationService,
} from 'src/features/plugin/formula';
import { FormulaValidationException } from 'src/features/share/exceptions';

describe('UpdateTableHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new UpdateTableCommand({
      revisionId: 'unreal',
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if patches length is less than 1', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [],
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Invalid length of patches',
    );
  });

  it('should throw an error if the patches are invalid', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    // the first "replace" patch is invalid
    let command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
            unrealKey: 'test',
          } as JsonStringSchema,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'patches is not valid',
    );

    // the second "add" element is invalid
    command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
        {
          op: 'add',
          path: '/properties/addKey',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
            unrealKey: 'test',
          } as JsonStringSchema,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'patches is not valid',
    );
  });

  it('should throw an error if findTableInRevisionOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Table not found'));

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Table not found');
  });

  it('should throw an error if itself foreign keys are found in checkItselfForeignKey', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            foreignKey: tableId,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Itself foreign key is not supported yet',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should apply patches to the row in the table', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).not.toBeNull();
    expect(row?.data).toStrictEqual({ ver: '2' });

    const table = await tableApiService.getTable({
      revisionId: draftRevisionId,
      tableId,
    });
    expect(table).not.toBeNull();
  });

  it('should save the schema correctly with ref', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'add',
          path: '/properties/files',
          value: getArraySchema(getRefSchema(SystemSchemaIds.File)),
        },
      ],
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    const tableSchema = (await tableApiService.resolveTableSchema({
      revisionId: draftRevisionId,
      tableId,
    })) as { type: string; properties: Record<string, unknown> } | null;
    expect(tableSchema).not.toBeNull();
    expect(tableSchema?.type).toBe('object');
    expect(tableSchema?.properties).toHaveProperty('files');
  });

  function runTransaction(
    command: UpdateTableCommand,
  ): Promise<UpdateTableHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;
  let viewsMigrationService: ViewsMigrationService;
  let rowApiService: RowApiService;
  let tableApiService: TableApiService;
  let formulaService: FormulaService;
  let formulaValidationService: FormulaValidationService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
    viewsMigrationService = result.viewsMigrationService;
    rowApiService = result.module.get<RowApiService>(RowApiService);
    tableApiService = result.module.get<TableApiService>(TableApiService);
    formulaService = result.module.get<FormulaService>(FormulaService);
    formulaValidationService = result.module.get<FormulaValidationService>(
      FormulaValidationService,
    );
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  describe('views migration on schema changes', () => {
    const createViewsData = (
      overrides: Partial<TableViewsData['views'][0]> = {},
    ): TableViewsData => ({
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'data.ver', width: 100 }],
          sorts: [{ field: 'data.ver', direction: 'asc' }],
          filters: {
            logic: 'and',
            conditions: [{ field: 'data.ver', operator: 'equals', value: 1 }],
          },
          ...overrides,
        },
      ],
    });

    const setupViews = (
      revisionId: string,
      tableId: string,
      viewsData: TableViewsData,
    ) =>
      transactionService.run(() =>
        commandBus.execute(
          new UpdateTableViewsCommand({ revisionId, tableId, viewsData }),
        ),
      );

    const getViewsData = async (
      revisionId: string,
      tableId: string,
    ): Promise<TableViewsData | null> => {
      const viewsTable = await prismaService.table.findFirst({
        where: {
          id: SystemTables.Views,
          revisions: { some: { id: revisionId } },
        },
      });
      if (!viewsTable) return null;

      const viewsRow = await prismaService.row.findFirst({
        where: {
          id: tableId,
          tables: { some: { versionId: viewsTable.versionId } },
        },
      });
      return viewsRow?.data as TableViewsData | null;
    };

    it('should migrate views on move patch (field rename)', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);
      await setupViews(draftRevisionId, tableId, createViewsData());

      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [
            {
              op: 'move',
              from: '/properties/ver',
              path: '/properties/version',
            },
          ],
        }),
      );

      const result = await getViewsData(draftRevisionId, tableId);

      expect(result?.views[0].columns).toEqual([
        { field: 'data.version', width: 100 },
      ]);
      expect(result?.views[0].sorts).toEqual([
        { field: 'data.version', direction: 'asc' },
      ]);
      expect(result?.views[0].filters?.conditions).toEqual([
        { field: 'data.version', operator: 'equals', value: 1 },
      ]);
    });

    it('should migrate views on remove patch (field deletion)', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);
      await setupViews(
        draftRevisionId,
        tableId,
        createViewsData({
          columns: [
            { field: 'data.ver', width: 100 },
            { field: 'id', width: 80 },
          ],
        }),
      );

      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [{ op: 'remove', path: '/properties/ver' }],
        }),
      );

      const result = await getViewsData(draftRevisionId, tableId);

      expect(result?.views[0].columns).toEqual([{ field: 'id', width: 80 }]);
      expect(result?.views[0].sorts).toEqual([]);
      expect(result?.views[0].filters?.conditions).toEqual([]);
    });

    it('should migrate views on replace patch (type change)', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);
      await setupViews(
        draftRevisionId,
        tableId,
        createViewsData({
          filters: {
            logic: 'and',
            conditions: [{ field: 'data.ver', operator: 'gt', value: 5 }],
          },
        }),
      );

      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [
            {
              op: 'replace',
              path: '/properties/ver',
              value: { type: JsonSchemaTypeName.String, default: '' },
            },
          ],
        }),
      );

      const result = await getViewsData(draftRevisionId, tableId);

      expect(result?.views[0].columns).toEqual([
        { field: 'data.ver', width: 100 },
      ]);
      expect(result?.views[0].sorts).toEqual([
        { field: 'data.ver', direction: 'asc' },
      ]);
      expect(result?.views[0].filters?.conditions).toEqual([]);
    });

    it('should not modify views when no views exist', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [
            {
              op: 'replace',
              path: '/properties/ver',
              value: { type: JsonSchemaTypeName.String, default: '' },
            },
          ],
        }),
      );

      const result = await getViewsData(draftRevisionId, tableId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException when views migration fails', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);
      await setupViews(
        draftRevisionId,
        tableId,
        createViewsData({ sorts: undefined, filters: undefined }),
      );

      jest
        .spyOn(viewsMigrationService, 'migrateViews')
        .mockImplementation(() => {
          throw new ViewsMigrationError(
            'Test migration error',
            { revisionId: draftRevisionId, tableId },
            { patchOp: 'move', patchPath: '/properties/ver' },
          );
        });

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          { op: 'move', from: '/properties/ver', path: '/properties/version' },
        ],
      });

      await expect(runTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runTransaction(command)).rejects.toThrow(
        /Views migration failed/,
      );
    });

    it('should use tableViewsSchema hash for migrated views row', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);
      await setupViews(draftRevisionId, tableId, createViewsData());

      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [
            {
              op: 'move',
              from: '/properties/ver',
              path: '/properties/version',
            },
          ],
        }),
      );

      const viewsTableRow = await prismaService.row.findFirst({
        where: {
          id: tableId,
          tables: {
            some: {
              id: SystemTables.Views,
            },
          },
        },
      });

      expect(viewsTableRow).not.toBeNull();
      expect(viewsTableRow!.schemaHash).toBe(objectHash(tableViewsSchema));
    });
  });

  describe('formula validation', () => {
    beforeEach(() => {
      Object.defineProperty(formulaService, 'isAvailable', { value: true });
      Object.defineProperty(
        formulaValidationService['formulaService'],
        'isAvailable',
        { value: true },
      );
    });

    const numberFieldWithFormula = (expression: string): any => ({
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
      'x-formula': { version: 1, expression },
    });

    it('should update table with valid formula in patch', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/doubled',
            value: numberFieldWithFormula('ver * 2'),
          },
        ],
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });

    it('should throw error for invalid formula syntax in patch', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/computed',
            value: numberFieldWithFormula('ver * * 2'),
          },
        ],
      });

      await expect(runTransaction(command)).rejects.toThrow(
        FormulaValidationException,
      );
    });

    it('should throw error for formula referencing non-existent field after rename', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'move',
            from: '/properties/ver',
            path: '/properties/version',
          },
          {
            op: 'add',
            path: '/properties/computed',
            value: numberFieldWithFormula('ver * 2'),
          },
        ],
      });

      await expect(runTransaction(command)).rejects.toThrow(
        FormulaValidationException,
      );
    });

    it('should allow formula referencing renamed field with correct name', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'move',
            from: '/properties/ver',
            path: '/properties/version',
          },
          {
            op: 'add',
            path: '/properties/computed',
            value: numberFieldWithFormula('version * 2'),
          },
        ],
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });

    it('should throw error for formula referencing deleted field', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const addFormulaCommand = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/quantity',
            value: { type: JsonSchemaTypeName.Number, default: 0 },
          },
          {
            op: 'add',
            path: '/properties/computed',
            value: numberFieldWithFormula('ver * quantity'),
          },
        ],
      });
      await runTransaction(addFormulaCommand);

      const removeFieldCommand = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'remove',
            path: '/properties/quantity',
          },
        ],
      });

      await expect(runTransaction(removeFieldCommand)).rejects.toThrow(
        FormulaValidationException,
      );
    });

    it('should reject x-formula when formula feature is disabled', async () => {
      Object.defineProperty(formulaService, 'isAvailable', { value: false });
      Object.defineProperty(
        formulaValidationService['formulaService'],
        'isAvailable',
        { value: false },
      );

      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/computed',
            value: numberFieldWithFormula('ver * 2'),
          },
        ],
      });

      await expect(runTransaction(command)).rejects.toThrow(
        FormulaValidationException,
      );
    });

    it('should allow update without x-formula when formula feature is disabled', async () => {
      Object.defineProperty(formulaService, 'isAvailable', { value: false });
      Object.defineProperty(
        formulaValidationService['formulaService'],
        'isAvailable',
        { value: false },
      );

      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/newField',
            value: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        ],
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });
  });

  describe('foreign key validation on schema migration', () => {
    it('should throw error when adding FK field to table with existing rows', async () => {
      const { draftRevisionId, tableId, linkedTable } = await prepareProject(
        prismaService,
        {
          createLinkedTable: true,
        },
      );

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/linkedRow',
            value: {
              type: JsonSchemaTypeName.String,
              default: '',
              foreignKey: linkedTable!.tableId,
            },
          },
        ],
      });

      await expect(runTransaction(command)).rejects.toThrow(
        /Foreign key error.*not found in table/i,
      );
    });

    it('should allow adding FK field to empty table', async () => {
      const branchData = await prepareBranch(prismaService);
      const {
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
      } = branchData;

      const linkedTableResult = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: testSchema,
      });

      const emptyTableResult = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: {
          type: JsonSchemaTypeName.Object,
          required: ['name'],
          properties: {
            name: { type: JsonSchemaTypeName.String, default: '' },
          },
          additionalProperties: false,
        },
      });

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId: emptyTableResult.tableId,
        patches: [
          {
            op: 'add',
            path: '/properties/ref',
            value: {
              type: JsonSchemaTypeName.String,
              default: '',
              foreignKey: linkedTableResult.tableId,
            },
          },
        ],
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });

    it('should allow adding FK field when all existing rows have valid references', async () => {
      const branchData = await prepareBranch(prismaService);
      const {
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
      } = branchData;

      const referencedTableResult = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: testSchema,
      });

      const targetRowResult = await prepareRow({
        prismaService,
        headTableVersionId: referencedTableResult.headTableVersionId,
        draftTableVersionId: referencedTableResult.draftTableVersionId,
        data: { ver: 1 },
        dataDraft: { ver: 1 },
        schema: testSchema,
      });

      const sourceTableResult = await prepareTableWithSchema({
        prismaService,
        headRevisionId,
        draftRevisionId,
        schemaTableVersionId,
        migrationTableVersionId,
        schema: {
          type: JsonSchemaTypeName.Object,
          required: ['refValue'],
          properties: {
            refValue: { type: JsonSchemaTypeName.String, default: '' },
          },
          additionalProperties: false,
        },
      });

      await prepareRow({
        prismaService,
        headTableVersionId: sourceTableResult.headTableVersionId,
        draftTableVersionId: sourceTableResult.draftTableVersionId,
        data: { refValue: targetRowResult.rowId },
        dataDraft: { refValue: targetRowResult.rowId },
        schema: sourceTableResult.schema,
      });

      const command = new UpdateTableCommand({
        revisionId: draftRevisionId,
        tableId: sourceTableResult.tableId,
        patches: [
          {
            op: 'replace',
            path: '/properties/refValue',
            value: {
              type: JsonSchemaTypeName.String,
              default: '',
              foreignKey: referencedTableResult.tableId,
            },
          },
        ],
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });
  });
});
