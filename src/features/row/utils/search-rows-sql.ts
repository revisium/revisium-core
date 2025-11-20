import { Prisma, Row, Table } from 'src/__generated__/client';
import {
  generateWhere,
  WhereConditionsTyped,
  JsonFilter,
} from '@revisium/prisma-pg-json';
import { DEFAULT_ROW_FIELDS } from './get-rows-sql';

export type RowWithTable = Row & {
  table_versionId: string;
  table_createdId: string;
  table_id: string;
  table_readonly: boolean;
  table_createdAt: Date;
  table_updatedAt: Date;
  table_system: boolean;
};

export function searchRowsSql(
  revisionId: string,
  searchQuery: string,
  take: number,
  skip: number,
): Prisma.Sql {
  const searchFilter: JsonFilter = {
    path: [],
    search: searchQuery,
    searchLanguage: 'simple',
    searchType: 'plain',
    searchIn: 'values',
  };

  const whereConditions: WhereConditionsTyped<typeof DEFAULT_ROW_FIELDS> = {
    data: searchFilter,
  };

  const whereClause = generateWhere({
    where: whereConditions,
    fieldConfig: DEFAULT_ROW_FIELDS,
    tableAlias: 'r',
  });

  return Prisma.sql`
    SELECT
      r."versionId",
      r."createdId",
      r."id",
      r."readonly",
      r."createdAt",
      r."updatedAt",
      r."publishedAt",
      r."data",
      r."meta",
      r."hash",
      r."schemaHash",
      t."versionId" as "table_versionId",
      t."createdId" as "table_createdId",
      t."id" as "table_id",
      t."readonly" as "table_readonly",
      t."createdAt" as "table_createdAt",
      t."updatedAt" as "table_updatedAt",
      t."system" as "table_system"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON rt."B" = t."versionId"
    INNER JOIN "_RevisionToTable" rvt ON t."versionId" = rvt."B"
    WHERE rvt."A" = ${revisionId}
      AND t."system" = false
      AND (${whereClause})
    ORDER BY r."createdAt" DESC
    LIMIT ${take}
    OFFSET ${skip}
  `;
}

export function searchRowsCountSql(
  revisionId: string,
  searchQuery: string,
): Prisma.Sql {
  const searchFilter: JsonFilter = {
    path: [],
    search: searchQuery,
    searchLanguage: 'simple',
    searchType: 'plain',
    searchIn: 'values',
  };

  const whereConditions: WhereConditionsTyped<typeof DEFAULT_ROW_FIELDS> = {
    data: searchFilter,
  };

  const whereClause = generateWhere({
    where: whereConditions,
    fieldConfig: DEFAULT_ROW_FIELDS,
    tableAlias: 'r',
  });

  return Prisma.sql`
    SELECT COUNT(*) as count
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON rt."B" = t."versionId"
    INNER JOIN "_RevisionToTable" rvt ON t."versionId" = rvt."B"
    WHERE rvt."A" = ${revisionId}
      AND t."system" = false
      AND (${whereClause})
  `;
}

export function convertRawRowsToEntities(
  rows: RowWithTable[],
): Array<{ row: Row; table: Table }> {
  return rows.map((rawRow) => {
    const row: Row = {
      versionId: rawRow.versionId,
      createdId: rawRow.createdId,
      id: rawRow.id,
      readonly: rawRow.readonly,
      createdAt: rawRow.createdAt,
      updatedAt: rawRow.updatedAt,
      publishedAt: rawRow.publishedAt,
      data: rawRow.data,
      meta: rawRow.meta,
      hash: rawRow.hash,
      schemaHash: rawRow.schemaHash,
    };

    const table: Table = {
      versionId: rawRow.table_versionId,
      createdId: rawRow.table_createdId,
      id: rawRow.table_id,
      readonly: rawRow.table_readonly,
      createdAt: rawRow.table_createdAt,
      updatedAt: rawRow.table_updatedAt,
      system: rawRow.table_system,
    };

    return { row, table };
  });
}
