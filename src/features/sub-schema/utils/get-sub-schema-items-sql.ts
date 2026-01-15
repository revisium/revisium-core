import { Prisma, Row, Table } from 'src/__generated__/client';
import {
  buildSubSchemaCte,
  buildSubSchemaWhere,
  buildSubSchemaOrderBy,
  SubSchemaTableConfig,
  SubSchemaWhereInput,
  SubSchemaOrderByItem,
} from '@revisium/prisma-pg-json';

const SUB_SCHEMA_CTE_NAME = 'sub_schema_items';
const SUB_SCHEMA_TABLE_ALIAS = 'ssi';
const ROW_TABLE_ALIAS = 'r';

export type SubSchemaRawItem = {
  tableId: string;
  rowId: string;
  rowVersionId: string;
  fieldPath: string;
} & {
  [K in keyof Row as `row_${K}`]: Row[K];
} & {
  [K in keyof Table as `table_${K}`]: Table[K];
};

export interface GetSubSchemaItemsSqlParams {
  tables: SubSchemaTableConfig[];
  where?: SubSchemaWhereInput;
  orderBy?: SubSchemaOrderByItem[];
  take: number;
  skip: number;
}

export function getSubSchemaItemsSql(
  params: GetSubSchemaItemsSqlParams,
): Prisma.Sql {
  const { tables, where, orderBy, take, skip } = params;

  if (tables.length === 0) {
    return Prisma.sql`
      SELECT
        NULL as "tableId",
        NULL as "rowId",
        NULL as "rowVersionId",
        NULL as "fieldPath",
        NULL as "row_versionId",
        NULL as "row_createdId",
        NULL as "row_id",
        NULL as "row_readonly",
        NULL as "row_createdAt",
        NULL as "row_updatedAt",
        NULL as "row_publishedAt",
        NULL as "row_data",
        NULL as "row_meta",
        NULL as "row_hash",
        NULL as "row_schemaHash",
        NULL as "table_versionId",
        NULL as "table_createdId",
        NULL as "table_id",
        NULL as "table_readonly",
        NULL as "table_createdAt",
        NULL as "table_updatedAt",
        NULL as "table_system"
      WHERE false
    `;
  }

  const cte = buildSubSchemaCte({ tables });
  const whereClause = buildSubSchemaWhere({
    where,
    tableAlias: SUB_SCHEMA_TABLE_ALIAS,
  });
  const orderByClause = buildSubSchemaOrderBy({
    orderBy,
    tableAlias: SUB_SCHEMA_TABLE_ALIAS,
    rowTableAlias: ROW_TABLE_ALIAS,
  });

  return Prisma.sql`
    ${cte}
    SELECT
      ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}."tableId",
      ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}."rowId",
      ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}."rowVersionId",
      ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}."fieldPath",
      r."versionId" as "row_versionId",
      r."createdId" as "row_createdId",
      r."id" as "row_id",
      r."readonly" as "row_readonly",
      r."createdAt" as "row_createdAt",
      r."updatedAt" as "row_updatedAt",
      r."publishedAt" as "row_publishedAt",
      r."data" as "row_data",
      r."meta" as "row_meta",
      r."hash" as "row_hash",
      r."schemaHash" as "row_schemaHash",
      t."versionId" as "table_versionId",
      t."createdId" as "table_createdId",
      t."id" as "table_id",
      t."readonly" as "table_readonly",
      t."createdAt" as "table_createdAt",
      t."updatedAt" as "table_updatedAt",
      t."system" as "table_system"
    FROM ${Prisma.raw(SUB_SCHEMA_CTE_NAME)} ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}
    INNER JOIN "Row" r ON ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}."rowVersionId" = r."versionId"
    INNER JOIN "Table" t ON ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}."tableVersionId" = t."versionId"
    ${whereClause}
    ${orderByClause}
    LIMIT ${take}
    OFFSET ${skip}
  `;
}

export function getSubSchemaItemsCountSql(
  params: Pick<GetSubSchemaItemsSqlParams, 'tables' | 'where'>,
): Prisma.Sql {
  const { tables, where } = params;

  if (tables.length === 0) {
    return Prisma.sql`SELECT 0::bigint as count`;
  }

  const cte = buildSubSchemaCte({ tables });
  const whereClause = buildSubSchemaWhere({
    where,
    tableAlias: SUB_SCHEMA_TABLE_ALIAS,
  });

  return Prisma.sql`
    ${cte}
    SELECT COUNT(*)::bigint as count
    FROM ${Prisma.raw(SUB_SCHEMA_CTE_NAME)} ${Prisma.raw(SUB_SCHEMA_TABLE_ALIAS)}
    ${whereClause}
  `;
}

export interface ParsedSubSchemaItem {
  tableId: string;
  rowId: string;
  rowVersionId: string;
  fieldPath: string;
  row: Row;
  table: Table;
}

export function convertRawSubSchemaItems(
  rawItems: SubSchemaRawItem[],
): ParsedSubSchemaItem[] {
  const rowCache = new Map<string, Row>();
  const tableCache = new Map<string, Table>();

  return rawItems.map((rawItem) => {
    let row = rowCache.get(rawItem.row_versionId);
    if (!row) {
      row = {
        versionId: rawItem.row_versionId,
        createdId: rawItem.row_createdId,
        id: rawItem.row_id,
        readonly: rawItem.row_readonly,
        createdAt: rawItem.row_createdAt,
        updatedAt: rawItem.row_updatedAt,
        publishedAt: rawItem.row_publishedAt,
        data: rawItem.row_data,
        meta: rawItem.row_meta,
        hash: rawItem.row_hash,
        schemaHash: rawItem.row_schemaHash,
      };
      rowCache.set(rawItem.row_versionId, row);
    }

    let table = tableCache.get(rawItem.table_versionId);
    if (!table) {
      table = {
        versionId: rawItem.table_versionId,
        createdId: rawItem.table_createdId,
        id: rawItem.table_id,
        readonly: rawItem.table_readonly,
        createdAt: rawItem.table_createdAt,
        updatedAt: rawItem.table_updatedAt,
        system: rawItem.table_system,
      };
      tableCache.set(rawItem.table_versionId, table);
    }

    return {
      tableId: rawItem.tableId,
      rowId: rawItem.rowId,
      rowVersionId: rawItem.rowVersionId,
      fieldPath: rawItem.fieldPath,
      row,
      table,
    };
  });
}
