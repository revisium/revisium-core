import { ChangeSource, ChangeType } from './enums';
import { FieldChange } from './field-change.types';
import { SchemaChangeImpact } from './schema-change.types';

export interface RowChange {
  rowId: string;
  rowCreatedId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeType: ChangeType;
  changeSource: ChangeSource;

  oldRowId?: string;
  newRowId?: string;

  fromData: unknown | null;
  toData: unknown | null;
  fromHash?: string;
  toHash?: string;
  fromSchemaHash?: string;
  toSchemaHash?: string;

  fieldChanges: FieldChange[];
  schemaImpact: SchemaChangeImpact | null;

  updatedAt: Date;
  publishedAt: Date;
  createdAt: Date;

  tableId: string;
  tableCreatedId: string;
}
