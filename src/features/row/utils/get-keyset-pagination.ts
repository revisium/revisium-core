import { Prisma, Row } from 'src/__generated__/client';
import {
  OrderByConditions,
  OrderByPart,
  WhereConditionsTyped,
  encodeCursor,
  decodeCursor,
  computeSortHash,
  extractCursorValues,
  buildKeysetCondition,
  generateOrderByParts,
} from '@revisium/prisma-pg-json';
import { IPaginatedType } from 'src/features/share/pagination.interface';
import {
  getRowsSql,
  getRowsCountSql,
  DEFAULT_ROW_FIELDS,
} from './get-rows-sql';

interface GetKeysetPaginationArgs<T> {
  pageData: { first: number; after?: string };
  tableVersionId: string;
  whereConditions?: WhereConditionsTyped<typeof DEFAULT_ROW_FIELDS>;
  orderBy?: OrderByConditions[];
  queryRaw: <R>(sql: Prisma.Sql) => Promise<R>;
  transformRows: (rows: Row[]) => Promise<T[]>;
}

export async function getKeysetPagination<T>({
  pageData,
  tableVersionId,
  whereConditions,
  orderBy,
  queryRaw,
  transformRows,
}: GetKeysetPaginationArgs<T>): Promise<IPaginatedType<T>> {
  const userParts = generateOrderByParts({
    tableAlias: 'r',
    orderBy,
    fieldConfig: DEFAULT_ROW_FIELDS,
  });

  const effectiveParts: OrderByPart[] =
    userParts.length > 0
      ? userParts
      : [
          {
            expression: Prisma.sql`r."createdAt"`,
            direction: 'DESC' as const,
            fieldName: 'createdAt',
            isJson: false,
          },
        ];

  const sortHash = computeSortHash(effectiveParts);

  let keysetCondition: Prisma.Sql | undefined;
  let hasPreviousPage = false;

  if (pageData.after) {
    const decoded = decodeCursor(pageData.after);
    if (
      decoded &&
      decoded.sortHash === sortHash &&
      decoded.values.length === effectiveParts.length
    ) {
      keysetCondition = buildKeysetCondition(
        effectiveParts,
        decoded.values,
        decoded.tiebreaker,
        Prisma.sql`r."versionId"`,
      );
      hasPreviousPage = true;
    }
  }

  const take = pageData.first;
  const rows = await queryRaw<Row[]>(
    getRowsSql(
      tableVersionId,
      take + 1,
      0,
      whereConditions,
      orderBy,
      keysetCondition,
    ),
  );

  const hasNextPage = rows.length > take;
  const resultRows = hasNextPage ? rows.slice(0, take) : rows;

  const transformedRows = await transformRows(resultRows);

  const edges = transformedRows.map((node, index) => {
    const row = resultRows[index] as unknown as Record<string, unknown>;
    const cursorValues = extractCursorValues(row, effectiveParts);
    const tiebreaker = row.versionId as string;
    return {
      cursor: encodeCursor(cursorValues, tiebreaker, sortHash),
      node,
    };
  });

  const countResult = await queryRaw<[{ count: bigint }]>(
    getRowsCountSql(tableVersionId, whereConditions),
  );
  const totalCount = Number(countResult[0].count);

  return {
    edges,
    pageInfo: {
      startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
      hasNextPage,
      hasPreviousPage,
    },
    totalCount,
  };
}
