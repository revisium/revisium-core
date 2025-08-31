import { Injectable } from '@nestjs/common';
import { Prisma, Row } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

// Using parameterized queries with $queryRaw for security
// https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#dynamic-table-names-in-postgresql

@Injectable()
export class ForeignKeysService {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransactionOrPrisma();
  }

  /**
   * Validates JSON object keys - accepts any valid string
   * Only rejects strings that could break PostgreSQL queries
   */
  private validateJsonKey(input: string, label = 'key'): void {
    // Only reject strings with null bytes or other characters that could break PostgreSQL
    if (input.includes('\0')) {
      throw new Error(`Invalid ${label}: contains null byte`);
    }

    // Length check for practical reasons
    if (input.length > 1000) {
      throw new Error(`Invalid ${label}: too long (max 1000 characters)`);
    }
  }

  /**
   * Validates JSON path format - very permissive, only essential safety checks
   */
  private validateJsonPath(path: string): void {
    // Basic JSON path validation - must start with $
    if (!path.startsWith('$')) {
      throw new Error(`Invalid JSON path: must start with $ - got: ${path}`);
    }

    // Only reject paths with null bytes that could break PostgreSQL
    if (path.includes('\0')) {
      throw new Error('Invalid JSON path: contains null byte');
    }
  }

  async findRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    // Validate key for safety
    this.validateJsonKey(key, 'key');

    // Build the JSON path with quoted key for safety and parameterized value
    const path = `$.**."${key}" ? (@ == $val)`;

    return this.transaction.$queryRaw<Row[]>`
      SELECT *
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A"
        FROM "_RowToTable"
        WHERE "B" = ${tableVersionId}
      )
      AND jsonb_path_exists(
        "data",
        ${path}::jsonpath,
        jsonb_build_object('val', to_jsonb(${value}::text))
      )
      ORDER BY "id" ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `;
  }

  async countRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
  ) {
    // Validate key for safety
    this.validateJsonKey(key, 'key');

    // Build the JSON path with quoted key for safety and parameterized value
    const path = `$.**."${key}" ? (@ == $val)`;

    const result: Array<{ count: string | number | bigint }> = await this
      .transaction.$queryRaw`
        SELECT count(*)
        FROM "Row"
        WHERE "versionId" IN (
          SELECT "A"
          FROM "_RowToTable"
          WHERE "B" = ${tableVersionId}
        )
        AND jsonb_path_exists(
          "data",
          ${path}::jsonpath,
          jsonb_build_object('val', to_jsonb(${value}::text))
        );
      `;

    return Number(result[0].count);
  }

  async findRowsByPathsAndValueInData(
    tableVersionId: string,
    jsonPaths: string[],
    value: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    if (jsonPaths.length === 0) {
      return [];
    }

    // Validate all JSON paths
    jsonPaths.forEach((path) => this.validateJsonPath(path));

    // Build conditions using Prisma.join for safe OR concatenation
    const conditions = Prisma.join(
      jsonPaths.map(
        (path) => Prisma.sql`
          jsonb_path_exists(
            "data",
            ${`${path} ? (@ == $val)`}::jsonpath,
            jsonb_build_object('val', to_jsonb(${value}::text))
          )
        `,
      ),
      ' OR ',
    );

    return this.transaction.$queryRaw<Row[]>`
      SELECT *
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A" FROM "_RowToTable" WHERE "B" = ${tableVersionId}
      )
      AND (${conditions})
      ORDER BY "id" ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `;
  }

  async countRowsByPathsAndValueInData(
    tableVersionId: string,
    jsonPaths: string[],
    value: string,
  ) {
    if (jsonPaths.length === 0) {
      return 0;
    }

    // Validate all JSON paths
    jsonPaths.forEach((path) => this.validateJsonPath(path));

    // Build conditions using Prisma.join for safe OR concatenation
    const conditions = Prisma.join(
      jsonPaths.map(
        (path) => Prisma.sql`
          jsonb_path_exists(
            "data",
            ${`${path} ? (@ == $val)`}::jsonpath,
            jsonb_build_object('val', to_jsonb(${value}::text))
          )
        `,
      ),
      ' OR ',
    );

    const result: Array<{ count: string | number | bigint }> = await this
      .transaction.$queryRaw`
        SELECT count(*)
        FROM "Row"
        WHERE "versionId" IN (
          SELECT "A" FROM "_RowToTable" WHERE "B" = ${tableVersionId}
        )
        AND (${conditions});
      `;

    return Number(result[0].count);
  }
}
