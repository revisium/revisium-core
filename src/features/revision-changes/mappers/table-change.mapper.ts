import { Injectable } from '@nestjs/common';
import {
  TableDiff,
  TableDiffChangeType,
} from 'src/features/share/diff.service';
import { TableChange, ChangeType } from '../types';
import { SchemaMigrationDetail } from '../types/schema-change.types';
import { Prisma } from 'src/__generated__/client';
import { SchemaImpactService } from '../services/schema-impact.service';

export interface RowStatsData {
  total: bigint | null;
  added: bigint | null;
  modified: bigint | null;
  removed: bigint | null;
  renamed: bigint | null;
}

@Injectable()
export class TableChangeMapper {
  constructor(private readonly schemaImpactService: SchemaImpactService) {}

  public mapTableDiffToTableChange(
    diff: TableDiff,
    migrations: Prisma.JsonValue[],
    rowStats: RowStatsData | null,
  ): TableChange {
    const changeType = this.mapChangeType(diff.changeType);

    return {
      tableId: diff.id,
      tableCreatedId: diff.createdId,
      fromVersionId: diff.fromVersionId,
      toVersionId: diff.toVersionId,
      changeType,
      ...this.mapRenamedFields(changeType, diff.fromId, diff.toId),
      schemaMigrations: this.extractSchemaMigrations(migrations),
      rowChangesCount: Number(rowStats?.total ?? 0),
      addedRowsCount: Number(rowStats?.added ?? 0),
      modifiedRowsCount: Number(rowStats?.modified ?? 0),
      removedRowsCount: Number(rowStats?.removed ?? 0),
      renamedRowsCount: Number(rowStats?.renamed ?? 0),
    };
  }

  private mapChangeType(changeType: TableDiffChangeType): ChangeType {
    switch (changeType) {
      case TableDiffChangeType.Added:
        return ChangeType.Added;
      case TableDiffChangeType.Modified:
        return ChangeType.Modified;
      case TableDiffChangeType.Removed:
        return ChangeType.Removed;
      case TableDiffChangeType.Renamed:
        return ChangeType.Renamed;
      case TableDiffChangeType.RenamedAndModified:
        return ChangeType.RenamedAndModified;
      default:
        return ChangeType.Modified;
    }
  }

  private mapRenamedFields(
    changeType: ChangeType,
    fromId?: string | null,
    toId?: string | null,
  ): { oldTableId?: string; newTableId?: string } {
    if (
      changeType !== ChangeType.Renamed &&
      changeType !== ChangeType.RenamedAndModified
    ) {
      return {};
    }

    return {
      oldTableId: fromId ?? undefined,
      newTableId: toId ?? undefined,
    };
  }

  private extractSchemaMigrations(
    migrations: Prisma.JsonValue[],
  ): SchemaMigrationDetail[] {
    return this.schemaImpactService.extractMigrationDetails(migrations);
  }
}
