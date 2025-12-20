import { Injectable } from '@nestjs/common';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TableViewsData, View } from 'src/features/views/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ChangeType } from '../types/enums';
import { ViewChange, ViewsChangeDetail } from '../types/views-change.types';

@Injectable()
export class ViewsComparisonService {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get prisma() {
    return this.transactionService.getTransactionOrPrisma();
  }

  async compareViewsForTable(
    fromRevisionId: string | null,
    toRevisionId: string,
    tableId: string,
  ): Promise<ViewsChangeDetail> {
    const [fromViews, toViews] = await Promise.all([
      fromRevisionId ? this.getViewsData(fromRevisionId, tableId) : null,
      this.getViewsData(toRevisionId, tableId),
    ]);

    return this.compareViewsData(fromViews, toViews);
  }

  private async getViewsData(
    revisionId: string,
    tableId: string,
  ): Promise<TableViewsData | null> {
    const viewsTable = await this.prisma.table.findFirst({
      where: {
        id: SystemTables.Views,
        revisions: {
          some: {
            id: revisionId,
          },
        },
      },
      select: {
        versionId: true,
      },
    });

    if (!viewsTable) {
      return null;
    }

    const viewsRow = await this.prisma.row.findFirst({
      where: {
        id: tableId,
        tables: {
          some: {
            versionId: viewsTable.versionId,
          },
        },
      },
      select: {
        data: true,
      },
    });

    if (!viewsRow) {
      return null;
    }

    return viewsRow.data as unknown as TableViewsData;
  }

  private compareViewsData(
    fromData: TableViewsData | null,
    toData: TableViewsData | null,
  ): ViewsChangeDetail {
    if (!fromData && !toData) {
      return this.createEmptyResult();
    }

    if (!fromData && toData) {
      return this.createAllAddedResult(toData.views);
    }

    if (fromData && !toData) {
      return this.createAllRemovedResult(fromData.views);
    }

    return this.compareExistingViews(fromData!, toData!);
  }

  private createEmptyResult(): ViewsChangeDetail {
    return {
      hasChanges: false,
      changes: [],
      addedCount: 0,
      modifiedCount: 0,
      removedCount: 0,
      renamedCount: 0,
    };
  }

  private createAllAddedResult(views: View[]): ViewsChangeDetail {
    const changes: ViewChange[] = views.map((view) => ({
      viewId: view.id,
      viewName: view.name,
      changeType: ChangeType.Added,
    }));

    return {
      hasChanges: changes.length > 0,
      changes,
      addedCount: changes.length,
      modifiedCount: 0,
      removedCount: 0,
      renamedCount: 0,
    };
  }

  private createAllRemovedResult(views: View[]): ViewsChangeDetail {
    const changes: ViewChange[] = views.map((view) => ({
      viewId: view.id,
      viewName: view.name,
      changeType: ChangeType.Removed,
    }));

    return {
      hasChanges: changes.length > 0,
      changes,
      addedCount: 0,
      modifiedCount: 0,
      removedCount: changes.length,
      renamedCount: 0,
    };
  }

  private compareExistingViews(
    fromData: TableViewsData,
    toData: TableViewsData,
  ): ViewsChangeDetail {
    const fromViewsMap = new Map(fromData.views.map((v) => [v.id, v]));
    const toViewsMap = new Map(toData.views.map((v) => [v.id, v]));

    const changes: ViewChange[] = [
      ...this.detectAddedAndModifiedViews(toData.views, fromViewsMap),
      ...this.detectRemovedViews(fromData.views, toViewsMap),
    ];

    const defaultViewChanged = fromData.defaultViewId !== toData.defaultViewId;
    const counts = this.countChanges(changes);

    return {
      hasChanges: changes.length > 0 || defaultViewChanged,
      changes,
      ...counts,
    };
  }

  private detectAddedAndModifiedViews(
    toViews: View[],
    fromViewsMap: Map<string, View>,
  ): ViewChange[] {
    return toViews
      .map((toView) =>
        this.detectViewChange(fromViewsMap.get(toView.id), toView),
      )
      .filter(Boolean) as ViewChange[];
  }

  private detectViewChange(
    fromView: View | undefined,
    toView: View,
  ): ViewChange | null {
    if (!fromView) {
      return {
        viewId: toView.id,
        viewName: toView.name,
        changeType: ChangeType.Added,
      };
    }

    const isModified = this.isViewModified(fromView, toView);
    const isRenamed = fromView.name !== toView.name;

    if (isModified && isRenamed) {
      return {
        viewId: toView.id,
        viewName: toView.name,
        changeType: ChangeType.RenamedAndModified,
        oldViewName: fromView.name,
      };
    }
    if (isModified) {
      return {
        viewId: toView.id,
        viewName: toView.name,
        changeType: ChangeType.Modified,
      };
    }
    if (isRenamed) {
      return {
        viewId: toView.id,
        viewName: toView.name,
        changeType: ChangeType.Renamed,
        oldViewName: fromView.name,
      };
    }
    return null;
  }

  private detectRemovedViews(
    fromViews: View[],
    toViewsMap: Map<string, View>,
  ): ViewChange[] {
    return fromViews
      .filter((fromView) => !toViewsMap.has(fromView.id))
      .map((fromView) => ({
        viewId: fromView.id,
        viewName: fromView.name,
        changeType: ChangeType.Removed,
      }));
  }

  private countChanges(changes: ViewChange[]): {
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
    renamedCount: number;
  } {
    return changes.reduce(
      (acc, change) => {
        switch (change.changeType) {
          case ChangeType.Added:
            acc.addedCount++;
            break;
          case ChangeType.Modified:
            acc.modifiedCount++;
            break;
          case ChangeType.Removed:
            acc.removedCount++;
            break;
          case ChangeType.Renamed:
            acc.renamedCount++;
            break;
          case ChangeType.RenamedAndModified:
            acc.renamedCount++;
            acc.modifiedCount++;
            break;
        }
        return acc;
      },
      { addedCount: 0, modifiedCount: 0, removedCount: 0, renamedCount: 0 },
    );
  }

  private isViewModified(fromView: View, toView: View): boolean {
    const fromConfig = this.normalizeViewConfig(fromView);
    const toConfig = this.normalizeViewConfig(toView);

    return JSON.stringify(fromConfig) !== JSON.stringify(toConfig);
  }

  private normalizeViewConfig(view: View): Omit<View, 'id' | 'name'> {
    return {
      description: view.description,
      columns: view.columns,
      filters: view.filters,
      sorts: view.sorts,
      search: view.search,
    };
  }
}
