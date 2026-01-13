import { Row } from 'src/__generated__/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import { RowWithTableId } from 'src/features/plugin/types';

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
});
