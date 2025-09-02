import { Prisma } from '@prisma/client';

/**
 * Shared test helpers for Prisma SQL Generator
 * These helpers work with prismaService.$queryRaw instead of pgClient
 */

/**
 * Run query using Prisma ORM for comparison (golden standard)
 */
export async function runPrismaOrmRows(
  prisma: any,
  {
    tableVersionId,
    where,
    orderBy,
    take = 50,
    skip = 0,
  }: {
    tableVersionId: string;
    where?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  },
) {
  return prisma.table
    .findUniqueOrThrow({ where: { versionId: tableVersionId } })
    .rows({ take, skip, orderBy, where });
}

/**
 * Run query using our custom SQL generator via Prisma.$queryRaw
 */
export async function runViaPrismaRaw(prisma: any, sqlNode: Prisma.Sql) {
  return (prisma.$queryRaw as any)(sqlNode) as Promise<any[]>;
}

/**
 * Compare results by IDs (ignoring order differences)
 */
export function compareByIds(prismaRows: any[], rawRows: any[]) {
  expect(rawRows.length).toBe(prismaRows.length);
  if (!rawRows.length) return;

  const prismaIds = prismaRows
    .map((r) => r.id)
    .slice()
    .sort();
  const rawIds = rawRows
    .map((r) => r.id)
    .slice()
    .sort();
  expect(rawIds).toEqual(prismaIds);
}

/**
 * Compare results exactly (including order)
 */
export function compareExactly(prismaRows: any[], rawRows: any[]) {
  expect(rawRows.length).toBe(prismaRows.length);
  if (!rawRows.length) return;

  const prismaIds = prismaRows.map((r) => r.id);
  const rawIds = rawRows.map((r) => r.id);
  expect(rawIds).toEqual(prismaIds);
}

/**
 * Validate that SQL query structure looks correct
 */
export function validateSqlStructure(query: Prisma.Sql) {
  const sql = query.inspect().sql;

  // Basic structure checks
  expect(sql).toContain('SELECT');
  expect(sql).toContain('FROM "Row" r');
  expect(sql).toContain('INNER JOIN "_RowToTable" rt');
  expect(sql).toContain('WHERE rt."B" =');
  expect(sql).toContain('ORDER BY');
  expect(sql).toContain('LIMIT');
  expect(sql).toContain('OFFSET');

  // Parameters should be properly escaped
  const params = query.inspect().values;
  expect(Array.isArray(params)).toBe(true);

  return { sql, params };
}

/**
 * Helper for testing pagination
 */
export async function testPagination(
  prisma: any,
  tableVersionId: string,
  generator: any,
  options: any,
) {
  // Test different pagination scenarios
  const scenarios = [
    { take: 5, skip: 0 },
    { take: 5, skip: 5 },
    { take: 10, skip: 0 },
    { take: 50, skip: 0 },
  ];

  for (const scenario of scenarios) {
    const testOptions = { ...options, ...scenario };

    const prismaResult = await runPrismaOrmRows(prisma, {
      tableVersionId,
      ...testOptions,
    });

    const query = generator.generateGetRowsQueryPrisma(
      tableVersionId,
      testOptions,
    );
    const rawResult = await runViaPrismaRaw(prisma, query);

    compareByIds(prismaResult, rawResult);
  }
}
