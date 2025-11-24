import { Injectable } from '@nestjs/common';
import { RowChange, ChangeType, ChangeSource } from '../types';
import { FieldChange } from '../types/field-change.types';
import { SchemaChangeImpact } from '../types/schema-change.types';

export interface RawRowChangeData {
  toRowId: string | null;
  fromRowId: string | null;
  rowCreatedId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeType: string;
  changeSource: string;
  fromData: unknown;
  toData: unknown;
  fromHash: string;
  toHash: string;
  fromSchemaHash: string;
  toSchemaHash: string;
  updatedAt: Date;
  publishedAt: Date;
  createdAt: Date;
  toTableId: string | null;
  fromTableId: string | null;
  tableCreatedId: string;
}

@Injectable()
export class RowChangeMapper {
  mapRawDataToRowChange(
    row: RawRowChangeData,
    fieldChanges: FieldChange[],
    schemaImpact: SchemaChangeImpact | null,
  ): RowChange {
    const changeType = row.changeType as ChangeType;
    const changeSource = row.changeSource as ChangeSource;

    return {
      rowId: row.toRowId ?? row.fromRowId ?? '',
      rowCreatedId: row.rowCreatedId,
      fromVersionId: row.fromVersionId,
      toVersionId: row.toVersionId,
      changeType,
      changeSource,
      ...this.mapRenamedRowIds(changeType, row.fromRowId, row.toRowId),
      fromData: row.fromData,
      toData: row.toData,
      fromHash: row.fromHash,
      toHash: row.toHash,
      fromSchemaHash: row.fromSchemaHash,
      toSchemaHash: row.toSchemaHash,
      fieldChanges,
      schemaImpact,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      tableId: row.toTableId ?? row.fromTableId ?? '',
      tableCreatedId: row.tableCreatedId,
    };
  }

  private mapRenamedRowIds(
    changeType: ChangeType,
    fromRowId: string | null,
    toRowId: string | null,
  ): { oldRowId?: string; newRowId?: string } {
    if (
      changeType !== ChangeType.Renamed &&
      changeType !== ChangeType.RenamedAndModified
    ) {
      return {};
    }

    return {
      oldRowId: fromRowId ?? undefined,
      newRowId: toRowId ?? undefined,
    };
  }
}
