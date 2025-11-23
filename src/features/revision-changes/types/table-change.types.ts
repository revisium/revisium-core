import { ChangeType } from './enums';
import { SchemaMigrationDetail } from './schema-change.types';

export interface TableChange {
  tableId: string;
  tableCreatedId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeType: ChangeType;

  oldTableId?: string;
  newTableId?: string;

  schemaMigrations: SchemaMigrationDetail[];

  rowChangesCount: number;
  addedRowsCount: number;
  modifiedRowsCount: number;
  removedRowsCount: number;
  renamedRowsCount: number;
}
