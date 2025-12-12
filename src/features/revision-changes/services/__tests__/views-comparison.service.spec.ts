import { Test, TestingModule } from '@nestjs/testing';
import { ViewsComparisonService } from '../views-comparison.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { TableViewsData } from 'src/features/views/types';
import { ChangeType } from '../../types/enums';

describe('ViewsComparisonService', () => {
  let service: ViewsComparisonService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewsComparisonService,
        {
          provide: TransactionPrismaService,
          useValue: {
            getTransactionOrPrisma: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ViewsComparisonService>(ViewsComparisonService);
  });

  describe('compareViewsData (private method tested via reflection)', () => {
    const compareViewsData = (
      fromData: TableViewsData | null,
      toData: TableViewsData | null,
    ) => {
      return (service as any).compareViewsData(fromData, toData);
    };

    it('returns empty result when both are null', () => {
      const result = compareViewsData(null, null);

      expect(result.hasChanges).toBe(false);
      expect(result.changes).toEqual([]);
      expect(result.addedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.renamedCount).toBe(0);
    });

    it('detects all views as added when fromData is null', () => {
      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'custom', name: 'Custom View' },
        ],
      };

      const result = compareViewsData(null, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(result.addedCount).toBe(2);
      expect(result.modifiedCount).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.renamedCount).toBe(0);

      expect(result.changes[0]).toEqual({
        viewId: 'default',
        viewName: 'Default',
        changeType: ChangeType.Added,
      });
      expect(result.changes[1]).toEqual({
        viewId: 'custom',
        viewName: 'Custom View',
        changeType: ChangeType.Added,
      });
    });

    it('detects all views as removed when toData is null', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'custom', name: 'Custom View' },
        ],
      };

      const result = compareViewsData(fromData, null);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(result.addedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.removedCount).toBe(2);
      expect(result.renamedCount).toBe(0);

      expect(result.changes[0]).toEqual({
        viewId: 'default',
        viewName: 'Default',
        changeType: ChangeType.Removed,
      });
    });

    it('detects added view', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'new-view', name: 'New View' },
        ],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.addedCount).toBe(1);
      expect(result.changes[0]).toEqual({
        viewId: 'new-view',
        viewName: 'New View',
        changeType: ChangeType.Added,
      });
    });

    it('detects removed view', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'old-view', name: 'Old View' },
        ],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.removedCount).toBe(1);
      expect(result.changes[0]).toEqual({
        viewId: 'old-view',
        viewName: 'Old View',
        changeType: ChangeType.Removed,
      });
    });

    it('detects modified view (columns changed)', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            columns: [{ field: 'id', width: 100 }],
          },
        ],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            columns: [
              { field: 'id', width: 100 },
              { field: 'name', width: 200 },
            ],
          },
        ],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.modifiedCount).toBe(1);
      expect(result.changes[0]).toEqual({
        viewId: 'default',
        viewName: 'Default',
        changeType: ChangeType.Modified,
      });
    });

    it('detects modified view (filters changed)', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            filters: {
              logic: 'and',
              conditions: [
                { field: 'status', operator: 'equals', value: 'active' },
              ],
            },
          },
        ],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedCount).toBe(1);
      expect(result.changes[0].changeType).toBe(ChangeType.Modified);
    });

    it('detects modified view (sorts changed)', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            sorts: [{ field: 'id', direction: 'asc' }],
          },
        ],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            sorts: [{ field: 'createdAt', direction: 'desc' }],
          },
        ],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedCount).toBe(1);
      expect(result.changes[0].changeType).toBe(ChangeType.Modified);
    });

    it('detects renamed view (name only changed)', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Main View' }],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.renamedCount).toBe(1);
      expect(result.modifiedCount).toBe(0);
      expect(result.changes[0]).toEqual({
        viewId: 'default',
        viewName: 'Main View',
        changeType: ChangeType.Renamed,
        oldViewName: 'Default',
      });
    });

    it('detects renamed and modified view', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            columns: [{ field: 'id' }],
          },
        ],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Main View',
            columns: [{ field: 'id' }, { field: 'name' }],
          },
        ],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.renamedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);
      expect(result.changes[0]).toEqual({
        viewId: 'default',
        viewName: 'Main View',
        changeType: ChangeType.RenamedAndModified,
        oldViewName: 'Default',
      });
    });

    it('detects default view change', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'custom', name: 'Custom' },
        ],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'custom',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'custom', name: 'Custom' },
        ],
      };

      const result = compareViewsData(fromData, toData);

      // No view changes, but defaultViewId changed
      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(0);
    });

    it('detects multiple changes', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'to-remove', name: 'To Remove' },
          { id: 'to-modify', name: 'To Modify', columns: [] },
        ],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          { id: 'default', name: 'Default' },
          { id: 'new-view', name: 'New View' },
          {
            id: 'to-modify',
            name: 'To Modify',
            columns: [{ field: 'name' }],
          },
        ],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toHaveLength(3);
      expect(result.addedCount).toBe(1);
      expect(result.removedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);

      const addedChange = result.changes.find(
        (c: any) => c.changeType === ChangeType.Added,
      );
      expect(addedChange?.viewId).toBe('new-view');

      const removedChange = result.changes.find(
        (c: any) => c.changeType === ChangeType.Removed,
      );
      expect(removedChange?.viewId).toBe('to-remove');

      const modifiedChange = result.changes.find(
        (c: any) => c.changeType === ChangeType.Modified,
      );
      expect(modifiedChange?.viewId).toBe('to-modify');
    });

    it('returns no changes when views are identical', () => {
      const viewsData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            columns: [{ field: 'id', width: 100 }],
            sorts: [{ field: 'id', direction: 'asc' }],
          },
        ],
      };

      const result = compareViewsData(viewsData, viewsData);

      expect(result.hasChanges).toBe(false);
      expect(result.changes).toHaveLength(0);
    });

    it('handles empty views array in fromData', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.addedCount).toBe(1);
    });

    it('handles empty views array in toData', () => {
      const fromData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      const toData: TableViewsData = {
        version: 1,
        defaultViewId: 'default',
        views: [],
      };

      const result = compareViewsData(fromData, toData);

      expect(result.hasChanges).toBe(true);
      expect(result.removedCount).toBe(1);
    });
  });

  describe('isViewModified (private method tested via reflection)', () => {
    const isViewModified = (fromView: any, toView: any) => {
      return (service as any).isViewModified(fromView, toView);
    };

    it('returns false for identical views', () => {
      const view = {
        id: 'v1',
        name: 'View',
        columns: [{ field: 'id' }],
        sorts: [],
        search: '',
      };

      expect(isViewModified(view, { ...view })).toBe(false);
    });

    it('returns true when columns differ', () => {
      const fromView = { id: 'v1', name: 'View', columns: [{ field: 'id' }] };
      const toView = {
        id: 'v1',
        name: 'View',
        columns: [{ field: 'id' }, { field: 'name' }],
      };

      expect(isViewModified(fromView, toView)).toBe(true);
    });

    it('returns true when filters differ', () => {
      const fromView = { id: 'v1', name: 'View' };
      const toView = {
        id: 'v1',
        name: 'View',
        filters: { logic: 'and', conditions: [] },
      };

      expect(isViewModified(fromView, toView)).toBe(true);
    });

    it('returns true when sorts differ', () => {
      const fromView = { id: 'v1', name: 'View', sorts: [] };
      const toView = {
        id: 'v1',
        name: 'View',
        sorts: [{ field: 'id', direction: 'asc' }],
      };

      expect(isViewModified(fromView, toView)).toBe(true);
    });

    it('returns true when search differs', () => {
      const fromView = { id: 'v1', name: 'View', search: '' };
      const toView = { id: 'v1', name: 'View', search: 'query' };

      expect(isViewModified(fromView, toView)).toBe(true);
    });

    it('returns true when description differs', () => {
      const fromView = { id: 'v1', name: 'View', description: 'Old desc' };
      const toView = { id: 'v1', name: 'View', description: 'New desc' };

      expect(isViewModified(fromView, toView)).toBe(true);
    });

    it('ignores name changes (handled separately)', () => {
      const fromView = { id: 'v1', name: 'Old Name', columns: [] };
      const toView = { id: 'v1', name: 'New Name', columns: [] };

      expect(isViewModified(fromView, toView)).toBe(false);
    });
  });
});
