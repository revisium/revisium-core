import { Prisma } from 'src/__generated__/client';
import {
  FieldConfig,
  generateOrderByClauses,
  generateWhere,
  OrderByConditions,
  WhereConditionsTyped,
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

const JSON_FIELDS = new Set(
  Object.entries(DEFAULT_ROW_FIELDS)
    .filter(([, type]) => type === 'json')
    .map(([name]) => name),
);

function hasJsonFilterInClauses(clauses: unknown): boolean {
  const arr = Array.isArray(clauses) ? clauses : clauses ? [clauses] : [];
  return arr.some((clause) => hasJsonFilter(clause));
}

export function hasJsonFilter(
  where: WhereConditionsTyped<typeof DEFAULT_ROW_FIELDS> | undefined,
): boolean {
  if (!where) {
    return false;
  }

  for (const key of Object.keys(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      continue;
    }
    if (JSON_FIELDS.has(key) && where[key as keyof typeof where] != null) {
      return true;
    }
  }

  const record = where as Record<string, unknown>;
  return (
    hasJsonFilterInClauses(record.AND) ||
    hasJsonFilterInClauses(record.OR) ||
    hasJsonFilterInClauses(record.NOT)
  );
}

const ROW_COLUMNS = Prisma.sql`
  r."versionId", r."createdId", r."id", r."readonly",
  r."createdAt", r."updatedAt", r."publishedAt",
  r."data", r."meta", r."hash", r."schemaHash"`;

const BASE_JOIN = Prisma.sql`
  FROM "Row" r
  INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"`;

export function getRowsSql(
  tableId: string,
  take: number,
  skip: number,
  whereConditions?: WhereConditionsTyped<typeof DEFAULT_ROW_FIELDS>,
  orderBy?: OrderByConditions[],
  keysetCondition?: Prisma.Sql,
): Prisma.Sql {
  const whereClause = generateWhere({
    where: whereConditions ?? {},
    fieldConfig: DEFAULT_ROW_FIELDS,
    tableAlias: 'r',
  });

  const userClauses = (orderBy ?? []).length
    ? generateOrderByClauses({
        orderBy,
        fieldConfig: DEFAULT_ROW_FIELDS,
        tableAlias: 'r',
      })
    : null;
  const orderByClause = userClauses
    ? Prisma.sql`ORDER BY ${userClauses}, ${Prisma.raw('r."versionId" DESC')}`
    : Prisma.sql`ORDER BY r."createdAt" DESC, r."versionId" DESC`;

  const keysetClause = keysetCondition
    ? Prisma.sql`AND ${keysetCondition}`
    : Prisma.sql``;

  const offsetClause = keysetCondition
    ? Prisma.sql``
    : Prisma.sql`OFFSET ${skip}`;

  if (hasJsonFilter(whereConditions)) {
    return Prisma.sql`
      WITH _rows AS (
        SELECT ${ROW_COLUMNS}
        ${BASE_JOIN}
        WHERE rt."B" = ${tableId}
      )
      SELECT * FROM _rows r
      WHERE (${whereClause})
        ${keysetClause}
      ${orderByClause}
      LIMIT ${take}
      ${offsetClause}
    `;
  }

  return Prisma.sql`
    SELECT ${ROW_COLUMNS}
    ${BASE_JOIN}
    WHERE rt."B" = ${tableId}
      AND (${whereClause})
      ${keysetClause}
    ${orderByClause}
    LIMIT ${take}
    ${offsetClause}
  `;
}

export function getRowsCountSql(
  tableId: string,
  whereConditions?: WhereConditionsTyped<typeof DEFAULT_ROW_FIELDS>,
): Prisma.Sql {
  const whereClause = generateWhere({
    where: whereConditions ?? {},
    fieldConfig: DEFAULT_ROW_FIELDS,
    tableAlias: 'r',
  });

  if (hasJsonFilter(whereConditions)) {
    return Prisma.sql`
      WITH _rows AS (
        SELECT ${ROW_COLUMNS}
        ${BASE_JOIN}
        WHERE rt."B" = ${tableId}
      )
      SELECT COUNT(*) as count FROM _rows r
      WHERE (${whereClause})
    `;
  }

  return Prisma.sql`
    SELECT COUNT(*) as count
    ${BASE_JOIN}
    WHERE rt."B" = ${tableId}
      AND (${whereClause})
  `;
}
