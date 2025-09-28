import { Prisma } from '@prisma/client';
import {
  FieldConfig,
  generateOrderBy,
  generateWhere,
  OrderByConditions,
  WhereConditions,
} from '@revisium/prisma-pg-json';

export const DEFAULT_ROW_FIELDS: FieldConfig = {
  versionId: 'string',
  createdId: 'string',
  id: 'string',
  hash: 'string',
  schemaHash: 'string',
  readonly: 'boolean',
  createdAt: 'date',
  updatedAt: 'date',
  publishedAt: 'date',
  data: 'json',
  meta: 'json',
};

export function getRowsSql(
  tableId: string,
  take: number,
  skip: number,
  whereConditions?: WhereConditions,
  orderBy?: OrderByConditions[],
): Prisma.Sql {
  const whereClause = generateWhere(
    whereConditions || {},
    DEFAULT_ROW_FIELDS,
    'r',
  );
  const orderByClause = (orderBy ?? []).length
    ? generateOrderBy('r', orderBy || {}, DEFAULT_ROW_FIELDS)
    : Prisma.sql`ORDER BY r."createdAt" DESC`;

  // Placeholder implementation
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
      r."schemaHash"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    WHERE rt."B" = ${tableId}
      AND (${whereClause})
    ${orderByClause}
    LIMIT ${take}
    OFFSET ${skip}
  `;
}

export function getRowsCountSql(
  tableId: string,
  whereConditions?: WhereConditions,
): Prisma.Sql {
  const whereClause = generateWhere(
    whereConditions || {},
    DEFAULT_ROW_FIELDS,
    'r',
  );

  return Prisma.sql`
    SELECT COUNT(*) as count
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    WHERE rt."B" = ${tableId}
      AND (${whereClause})
  `;
}
