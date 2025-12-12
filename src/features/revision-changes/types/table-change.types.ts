import { ChangeType } from './enums';
import { SchemaMigrationDetail } from './schema-change.types';
import { ViewsChangeDetail } from './views-change.types';

export interface TableChange {
  tableId: string;
  tableCreatedId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeType: ChangeType;

  oldTableId?: string;
  newTableId?: string;

  schemaMigrations: SchemaMigrationDetail[];
  viewsChanges: ViewsChangeDetail;

  rowChangesCount: number;
  addedRowsCount: number;
  modifiedRowsCount: number;
  removedRowsCount: number;
  renamedRowsCount: number;
}
