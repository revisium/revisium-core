import { Injectable } from '@nestjs/common';
import { Row, Table } from 'src/__generated__/client';
import { getRowChangesPaginatedBetweenRevisions } from 'src/__generated__/client/sql/getRowChangesPaginatedBetweenRevisions';
import {
  RowChange,
  AddedRowChange,
  RemovedRowChange,
  ModifiedRowChange,
} from '../types';
import { ChangeType } from '../types/enums';
import { FieldChange } from '../types/field-change.types';

export type RawRowChangeData = getRowChangesPaginatedBetweenRevisions.Result;

@Injectable()
export class RowChangeMapper {
  mapRawDataToRowChange(
    raw: RawRowChangeData,
    fieldChanges: FieldChange[],
  ): RowChange {
    const changeType = raw.changeType as ChangeType;

    switch (changeType) {
      case ChangeType.Added:
        return this.mapAddedRowChange(raw, fieldChanges);
      case ChangeType.Removed:
        return this.mapRemovedRowChange(raw, fieldChanges);
      default:
        return this.mapModifiedRowChange(raw, changeType, fieldChanges);
    }
  }

  private mapAddedRowChange(
    raw: RawRowChangeData,
    fieldChanges: FieldChange[],
  ): AddedRowChange {
    return {
      changeType: ChangeType.Added,
      row: this.buildRow(raw, 'to'),
      fromRow: null,
      table: this.buildTable(raw, 'to'),
      fromTable: null,
      fieldChanges,
    };
  }

  private mapRemovedRowChange(
    raw: RawRowChangeData,
    fieldChanges: FieldChange[],
  ): RemovedRowChange {
    return {
      changeType: ChangeType.Removed,
      row: null,
      fromRow: this.buildRow(raw, 'from'),
      table: null,
      fromTable: this.buildTable(raw, 'from'),
      fieldChanges,
    };
  }

  private mapModifiedRowChange(
    raw: RawRowChangeData,
    changeType:
      | ChangeType.Modified
      | ChangeType.Renamed
      | ChangeType.RenamedAndModified,
    fieldChanges: FieldChange[],
  ): ModifiedRowChange {
    return {
      changeType,
      row: this.buildRow(raw, 'to'),
      fromRow: this.buildRow(raw, 'from'),
      table: this.buildTable(raw, 'to'),
      fromTable: this.buildTable(raw, 'from'),
      fieldChanges,
    };
  }

  buildRow(raw: RawRowChangeData, prefix: 'to' | 'from'): Row {
    if (prefix === 'to') {
      return {
        id: raw.toRowId,
        createdId: raw.toRowCreatedId,
        versionId: raw.toRowVersionId,
        data: raw.toData,
        hash: raw.toHash,
        schemaHash: raw.toSchemaHash,
        readonly: raw.toReadonly,
        meta: raw.toMeta,
        createdAt: raw.toRowCreatedAt,
        updatedAt: raw.toRowUpdatedAt,
        publishedAt: raw.toRowPublishedAt,
      };
    }

    return {
      id: raw.fromRowId,
      createdId: raw.fromRowCreatedId,
      versionId: raw.fromRowVersionId,
      data: raw.fromData,
      hash: raw.fromHash,
      schemaHash: raw.fromSchemaHash,
      readonly: raw.fromReadonly,
      meta: raw.fromMeta,
      createdAt: raw.fromRowCreatedAt,
      updatedAt: raw.fromRowUpdatedAt,
      publishedAt: raw.fromRowPublishedAt,
    };
  }

  private buildTable(raw: RawRowChangeData, prefix: 'to' | 'from'): Table {
    if (prefix === 'to') {
      return {
        id: raw.toTableId,
        createdId: raw.toTableCreatedId,
        versionId: raw.toTableVersionId,
        readonly: raw.toTableReadonly,
        system: raw.toTableSystem,
        createdAt: raw.toTableCreatedAt,
        updatedAt: raw.toTableUpdatedAt,
      };
    }

    return {
      id: raw.fromTableId,
      createdId: raw.fromTableCreatedId,
      versionId: raw.fromTableVersionId,
      readonly: raw.fromTableReadonly,
      system: raw.fromTableSystem,
      createdAt: raw.fromTableCreatedAt,
      updatedAt: raw.fromTableUpdatedAt,
    };
  }
}
