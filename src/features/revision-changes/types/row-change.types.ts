import { Row, Table } from 'src/__generated__/client';
import { ChangeType } from './enums';
import { FieldChange } from './field-change.types';

interface RowChangeBase {
  fieldChanges: FieldChange[];
}

export interface AddedRowChange extends RowChangeBase {
  changeType: ChangeType.Added;
  row: Row;
  fromRow: null;
  table: Table;
  fromTable: null;
}

export interface RemovedRowChange extends RowChangeBase {
  changeType: ChangeType.Removed;
  row: null;
  fromRow: Row;
  table: null;
  fromTable: Table;
}

export interface ModifiedRowChange extends RowChangeBase {
  changeType:
    | ChangeType.Modified
    | ChangeType.Renamed
    | ChangeType.RenamedAndModified;
  row: Row;
  fromRow: Row;
  table: Table;
  fromTable: Table;
}

export type RowChange = AddedRowChange | RemovedRowChange | ModifiedRowChange;

export function getRowCreatedId(change: RowChange): string {
  return change.row?.createdId ?? change.fromRow?.createdId ?? '';
}

export function getTableCreatedId(change: RowChange): string {
  return change.table?.createdId ?? change.fromTable?.createdId ?? '';
}
