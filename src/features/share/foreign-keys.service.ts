import { Injectable } from '@nestjs/common';
import { Row } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

// TODO avoid $queryRawUnsafe
// https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#dynamic-table-names-in-postgresql

@Injectable()
export class ForeignKeysService {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async findRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    // TODO refactor  unsafe
    const query = `
      SELECT *
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A"
        FROM "_RowToTable"
        WHERE "B" = '${tableVersionId}'
      )
      AND jsonb_path_exists("data", '$.**.${key} ? (@ == "${value}")')
      ORDER BY "id" ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return this.transaction.$queryRawUnsafe<Row[]>(query);
  }

  async countRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
  ) {
    // TODO refactor  unsafe
    const query = `
      SELECT count(*)
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A"
        FROM "_RowToTable"
        WHERE "B" = '${tableVersionId}'
      )
      AND jsonb_path_exists("data", '$.**.${key} ? (@ == "${value}")');
    `;

    const result: [{ count: number }] =
      await this.transaction.$queryRawUnsafe(query);

    return Number(result[0].count);
  }

  async findRowsByPathsAndValueInData(
    tableVersionId: string,
    jsonPaths: string[],
    value: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    // TODO refactor unsafe
    const conditions = jsonPaths
      .map((path) => `jsonb_path_exists("data", '${path} ? (@ == "${value}")')`)
      .join(' OR ');

    const query = `
      SELECT *
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A"
        FROM "_RowToTable"
        WHERE "B" = '${tableVersionId}'
      )
      AND (${conditions})
      ORDER BY "id" ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return this.transaction.$queryRawUnsafe<Row[]>(query);
  }

  async countRowsByPathsAndValueInData(
    tableVersionId: string,
    jsonPaths: string[],
    value: string,
  ) {
    // TODO refactor  unsafe
    const conditions = jsonPaths
      .map((path) => `jsonb_path_exists("data", '${path} ? (@ == "${value}")')`)
      .join(' OR ');

    const query = `
      SELECT count(*)
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A"
        FROM "_RowToTable"
        WHERE "B" = '${tableVersionId}'
      )
      AND (${conditions});
    `;

    const result: [{ count: number }] =
      await this.transaction.$queryRawUnsafe(query);

    return Number(result[0].count);
  }
}
