import { Injectable, BadRequestException } from '@nestjs/common';
import { Row } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Injectable()
export class ForeignKeysService {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  private validateSqlInjection(value: string, paramName: string) {
    const sqlInjectionPattern = /['";\\]|--/g;
    if (sqlInjectionPattern.test(value)) {
      throw new BadRequestException(`${paramName} contains invalid characters`);
    }
  }

  private validateCommonParams(tableVersionId: string, value: string) {
    if (!tableVersionId) {
      throw new BadRequestException('tableVersionId cannot be empty');
    }

    if (!value) {
      throw new BadRequestException('value cannot be empty');
    }

    this.validateSqlInjection(tableVersionId, 'tableVersionId');
    this.validateSqlInjection(value, 'value');
  }

  private validatePaginationParams(limit?: number, offset?: number) {
    if (typeof limit !== 'undefined' && limit < 0) {
      throw new BadRequestException('limit cannot be negative');
    }
    if (typeof offset !== 'undefined' && offset < 0) {
      throw new BadRequestException('offset cannot be negative');
    }
  }

  async findRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    this.validateCommonParams(tableVersionId, value);

    if (!key) {
      throw new BadRequestException('key cannot be empty');
    }

    this.validateSqlInjection(key, 'key');
    this.validatePaginationParams(limit, offset);

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
    this.validateCommonParams(tableVersionId, value);
    if (!key) {
      throw new BadRequestException('key cannot be empty');
    }
    this.validateSqlInjection(key, 'key');

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
    this.validateCommonParams(tableVersionId, value);

    if (!jsonPaths.length) {
      throw new BadRequestException('jsonPaths cannot be empty');
    }

    jsonPaths.forEach((path, index) => {
      this.validateSqlInjection(path, `jsonPaths[${index}]`);
    });

    this.validatePaginationParams(limit, offset);

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
    this.validateCommonParams(tableVersionId, value);
    if (!jsonPaths.length) {
      throw new BadRequestException('jsonPaths cannot be empty');
    }
    jsonPaths.forEach((path, index) => {
      this.validateSqlInjection(path, `jsonPaths[${index}]`);
    });

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
