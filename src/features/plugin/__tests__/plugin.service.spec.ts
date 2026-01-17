import { Row } from 'src/__generated__/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import {
  ComputeRowsResult,
  FormulaFieldError,
  RowWithTableId,
} from 'src/features/plugin/types';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemTables } from 'src/features/share/system-tables.consts';

describe('PluginService', () => {
  describe('groupRowsByTable', () => {
    let pluginService: PluginService;

    beforeEach(() => {
      pluginService = new PluginService(
        null as never,
        null as never,
        null as never,
        null as never,
        null as never,
        null as never,
      );
    });

    const createRow = (versionId: string): Row => ({ versionId }) as Row;

    it('should return empty map for empty input', () => {
      const result = pluginService.groupRowsByTable([]);

      expect(result.size).toBe(0);
    });

    it('should group rows by tableId', () => {
      const row1 = createRow('v1');
      const row2 = createRow('v2');
      const row3 = createRow('v3');

      const items: RowWithTableId[] = [
        { tableId: 'table-a', row: row1 },
        { tableId: 'table-b', row: row2 },
        { tableId: 'table-a', row: row3 },
      ];

      const result = pluginService.groupRowsByTable(items);

      expect(result.size).toBe(2);
      expect(result.get('table-a')).toEqual([row1, row3]);
      expect(result.get('table-b')).toEqual([row2]);
    });

    it('should deduplicate rows by versionId within same table', () => {
      const row = createRow('v1');

      const items: RowWithTableId[] = [
        { tableId: 'table-a', row },
        { tableId: 'table-a', row },
        { tableId: 'table-a', row },
      ];

      const result = pluginService.groupRowsByTable(items);

      expect(result.get('table-a')).toHaveLength(1);
      expect(result.get('table-a')).toEqual([row]);
    });

    it('should keep different rows from same table', () => {
      const row1 = createRow('v1');
      const row2 = createRow('v2');

      const items: RowWithTableId[] = [
        { tableId: 'table-a', row: row1 },
        { tableId: 'table-a', row: row2 },
      ];

      const result = pluginService.groupRowsByTable(items);

      expect(result.get('table-a')).toHaveLength(2);
      expect(result.get('table-a')).toEqual([row1, row2]);
    });

    it('should handle same row appearing in different contexts (multiple file fields)', () => {
      const row = createRow('v1');

      const items: RowWithTableId[] = [
        { tableId: 'table-a', row },
        { tableId: 'table-a', row },
        { tableId: 'table-a', row },
      ];

      const result = pluginService.groupRowsByTable(items);

      expect(result.get('table-a')).toHaveLength(1);
    });

    it('should not deduplicate same versionId across different tables', () => {
      const row1 = createRow('v1');
      const row2 = createRow('v1');

      const items: RowWithTableId[] = [
        { tableId: 'table-a', row: row1 },
        { tableId: 'table-b', row: row2 },
      ];

      const result = pluginService.groupRowsByTable(items);

      expect(result.get('table-a')).toHaveLength(1);
      expect(result.get('table-b')).toHaveLength(1);
    });
  });

  describe('computeRows', () => {
    const createError = (
      field: string,
      expression: string,
    ): FormulaFieldError => ({
      field,
      expression,
      error: 'test error',
      defaultUsed: true,
    });

    const createMockPlugin = (result: ComputeRowsResult) => ({
      afterCreateRow: jest.fn(),
      afterUpdateRow: jest.fn(),
      computeRows: jest.fn().mockReturnValue(result),
      afterMigrateRows: jest.fn(),
      isAvailable: true,
    });

    it('should collect formula errors from plugin', async () => {
      const error = createError('total', 'price * qty');
      const mockPlugin = createMockPlugin({
        formulaErrors: new Map([['row1', [error]]]),
      });

      const mockPluginListService = {
        orderedPlugins: [mockPlugin],
      } as unknown as PluginListService;

      const mockShareQueries = {
        getTableSchema: jest.fn().mockResolvedValue({
          schema: { type: 'object', properties: {} },
          hash: 'hash123',
        }),
      };

      const mockSchemaStore = {
        create: jest.fn().mockReturnValue({}),
      } as unknown as JsonSchemaStoreService;

      const pluginService = new PluginService(
        mockShareQueries as never,
        null as never,
        null as never,
        mockSchemaStore,
        null as never,
        mockPluginListService,
      );

      const result = await pluginService.computeRows({
        revisionId: 'rev1',
        tableId: 'users',
        rows: [],
      });

      expect(result.formulaErrors).toBeDefined();
      expect(result.formulaErrors?.get('row1')).toEqual([error]);
    });

    it('should merge errors from multiple rows', async () => {
      const error1 = createError('total', 'price * qty');
      const error2 = createError('discount', 'price * 0.1');

      const mockPlugin = createMockPlugin({
        formulaErrors: new Map([
          ['row1', [error1]],
          ['row2', [error2]],
        ]),
      });

      const mockPluginListService = {
        orderedPlugins: [mockPlugin],
      } as unknown as PluginListService;

      const mockShareQueries = {
        getTableSchema: jest.fn().mockResolvedValue({
          schema: { type: 'object', properties: {} },
          hash: 'hash123',
        }),
      };

      const mockSchemaStore = {
        create: jest.fn().mockReturnValue({}),
      } as unknown as JsonSchemaStoreService;

      const pluginService = new PluginService(
        mockShareQueries as never,
        null as never,
        null as never,
        mockSchemaStore,
        null as never,
        mockPluginListService,
      );

      const result = await pluginService.computeRows({
        revisionId: 'rev1',
        tableId: 'users',
        rows: [],
      });

      expect(result.formulaErrors?.size).toBe(2);
      expect(result.formulaErrors?.get('row1')).toEqual([error1]);
      expect(result.formulaErrors?.get('row2')).toEqual([error2]);
    });

    it('should return empty object when no errors', async () => {
      const mockPlugin = createMockPlugin({});

      const mockPluginListService = {
        orderedPlugins: [mockPlugin],
      } as unknown as PluginListService;

      const mockShareQueries = {
        getTableSchema: jest.fn().mockResolvedValue({
          schema: { type: 'object', properties: {} },
          hash: 'hash123',
        }),
      };

      const mockSchemaStore = {
        create: jest.fn().mockReturnValue({}),
      } as unknown as JsonSchemaStoreService;

      const pluginService = new PluginService(
        mockShareQueries as never,
        null as never,
        null as never,
        mockSchemaStore,
        null as never,
        mockPluginListService,
      );

      const result = await pluginService.computeRows({
        revisionId: 'rev1',
        tableId: 'users',
        rows: [],
      });

      expect(result.formulaErrors).toBeUndefined();
    });

    it('should skip system tables', async () => {
      const mockPlugin = createMockPlugin({
        formulaErrors: new Map([['row1', [createError('f', 'e')]]]),
      });

      const mockPluginListService = {
        orderedPlugins: [mockPlugin],
      } as unknown as PluginListService;

      const mockShareQueries = {
        getTableSchema: jest.fn(),
      };

      const pluginService = new PluginService(
        mockShareQueries as never,
        null as never,
        null as never,
        null as never,
        null as never,
        mockPluginListService,
      );

      const result = await pluginService.computeRows({
        revisionId: 'rev1',
        tableId: SystemTables.Schema,
        rows: [],
      });

      expect(result).toEqual({});
      expect(mockPlugin.computeRows).not.toHaveBeenCalled();
      expect(mockShareQueries.getTableSchema).not.toHaveBeenCalled();
    });
  });
});
