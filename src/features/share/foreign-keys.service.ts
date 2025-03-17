import { Injectable, BadRequestException } from '@nestjs/common';
import { Row } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

interface QueryOptions {
  tableVersionId: string;
  value: string;
  limit?: number;
  offset?: number;
}

interface KeyValueQuery extends QueryOptions {
  key: string;
}

interface PathsQuery extends QueryOptions {
  jsonPaths: string[];
}

@Injectable()
export class ForeignKeysService {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  public async findRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<Row[]> {
    const params: KeyValueQuery = { tableVersionId, key, value, limit, offset };
    this.validateKeyValueParams(params);
    this.validatePaginationParams(limit, offset);

    const query = `
      SELECT *
      ${this.buildBaseQuery(tableVersionId)}
      AND ${this.buildKeyValueCondition(key, value)}
      ${this.buildPaginationClause(limit, offset)}
    `;

    return this.transaction.$queryRawUnsafe<Row[]>(query);
  }

  public async countRowsByKeyValueInData(
    tableVersionId: string,
    key: string,
    value: string,
  ): Promise<number> {
    const params: KeyValueQuery = { tableVersionId, key, value };
    this.validateKeyValueParams(params);

    const query = `
      SELECT count(*)
      ${this.buildBaseQuery(tableVersionId)}
      AND ${this.buildKeyValueCondition(key, value)}
    `;

    const result: [{ count: number }] =
      await this.transaction.$queryRawUnsafe(query);
    return Number(result[0].count);
  }

  public async findRowsByPathsAndValueInData(
    tableVersionId: string,
    jsonPaths: string[],
    value: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<Row[]> {
    const params: PathsQuery = {
      tableVersionId,
      jsonPaths,
      value,
      limit,
      offset,
    };
    this.validatePathsParams(params);
    this.validatePaginationParams(limit, offset);

    const query = `
      SELECT *
      ${this.buildBaseQuery(tableVersionId)}
      AND ${this.buildPathsCondition(jsonPaths, value)}
      ${this.buildPaginationClause(limit, offset)}
    `;

    return this.transaction.$queryRawUnsafe<Row[]>(query);
  }

  public async countRowsByPathsAndValueInData(
    tableVersionId: string,
    jsonPaths: string[],
    value: string,
  ): Promise<number> {
    const params: PathsQuery = { tableVersionId, jsonPaths, value };
    this.validatePathsParams(params);

    const query = `
      SELECT count(*)
      ${this.buildBaseQuery(tableVersionId)}
      AND ${this.buildPathsCondition(jsonPaths, value)}
    `;

    const result: [{ count: number }] =
      await this.transaction.$queryRawUnsafe(query);
    return Number(result[0].count);
  }

  private validateSqlInjection(value: string, paramName: string) {
    const sqlInjectionPattern =
      /['";]|\\(?!u[0-9a-f]{4})|--|@@|pg_|sys\.|information_schema/gi;
    if (sqlInjectionPattern.test(value)) {
      throw new BadRequestException(`${paramName} contains invalid characters`);
    }
  }

  private validateJsonPathValue(value: string) {
    const jsonPathPattern = /[$@*\[\]{}?().:,&|!<>=]/g;
    if (jsonPathPattern.test(value)) {
      throw new BadRequestException(
        'value contains invalid JSONPath characters',
      );
    }

    const unicodePattern = /\\u[0-9a-f]{4}/gi;
    if (unicodePattern.test(value)) {
      throw new BadRequestException('value contains invalid Unicode sequences');
    }

    const controlCharsPattern = /[\x00-\x1F\x7F]/g;
    if (controlCharsPattern.test(value)) {
      throw new BadRequestException(
        'value contains invalid control characters',
      );
    }

    if (value.length > 1000) {
      throw new BadRequestException(
        'value exceeds maximum length of 1000 characters',
      );
    }
  }

  private validateCommonParams({ tableVersionId, value }: QueryOptions) {
    if (!tableVersionId) {
      throw new BadRequestException('tableVersionId cannot be empty');
    }
    if (!value) {
      throw new BadRequestException('value cannot be empty');
    }

    this.validateSqlInjection(tableVersionId, 'tableVersionId');
    this.validateSqlInjection(value, 'value');
    this.validateJsonPathValue(value);
  }

  private validatePaginationParams(limit?: number, offset?: number) {
    if (typeof limit !== 'undefined' && limit < 0) {
      throw new BadRequestException('limit cannot be negative');
    }
    if (typeof offset !== 'undefined' && offset < 0) {
      throw new BadRequestException('offset cannot be negative');
    }
  }

  private validateKeyValueParams({ key, ...rest }: KeyValueQuery) {
    this.validateCommonParams(rest);
    if (!key) {
      throw new BadRequestException('key cannot be empty');
    }
    this.validateSqlInjection(key, 'key');
  }

  private validatePathsParams({ jsonPaths, ...rest }: PathsQuery) {
    this.validateCommonParams(rest);
    if (!jsonPaths.length) {
      throw new BadRequestException('jsonPaths cannot be empty');
    }
    jsonPaths.forEach((path, index) => {
      this.validateSqlInjection(path, `jsonPaths[${index}]`);
    });
  }

  private buildBaseQuery(tableVersionId: string) {
    return `
      FROM "Row"
      WHERE "versionId" IN (
        SELECT "A"
        FROM "_RowToTable"
        WHERE "B" = '${tableVersionId}'
      )
    `;
  }

  private buildKeyValueCondition(key: string, value: string) {
    return `jsonb_path_exists("data", '$.**.${key} ? (@ == "${value}")')`;
  }

  private buildPathsCondition(jsonPaths: string[], value: string) {
    const conditions = jsonPaths
      .map((path) => `jsonb_path_exists("data", '${path} ? (@ == "${value}")')`)
      .join(' OR ');
    return `(${conditions})`;
  }

  private buildPaginationClause(limit?: number, offset?: number) {
    return `
      ORDER BY "id" ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }
}
