import { ChangeType } from './enums';
import { FieldChange } from './field-change.types';

export interface RowChange {
  rowId: string;
  rowCreatedId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeType: ChangeType;

  oldRowId?: string;
  newRowId?: string;

  fromData: unknown | null;
  toData: unknown | null;
  fromHash?: string;
  toHash?: string;
  fromSchemaHash?: string;
  toSchemaHash?: string;

  fieldChanges: FieldChange[];

  updatedAt: Date;
  publishedAt: Date;
  createdAt: Date;

  tableId: string;
  tableCreatedId: string;
}
