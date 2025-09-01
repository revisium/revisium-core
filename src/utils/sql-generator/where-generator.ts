/**
 * Simple WHERE clause generator for getRows.sql
 * Based on Prisma FilterVisitor patterns but simplified for our use case
 */

import {
  WhereConditions,
  StringFilter,
  BoolFilter,
  DateFilter,
  JsonFilter,
  SqlResult,
  RowOrderInput,
} from './types';

/**
 * Main WHERE clause generator
 */
export class WhereGenerator {
  private paramIndex = 1;
  private params: any[] = [];

  constructor(startParamIndex: number = 1) {
    this.paramIndex = startParamIndex;
  }

  addParam(value: any): string {
    this.params.push(value);
    return `$${this.paramIndex++}`;
  }

  getParams(): any[] {
    return this.params;
  }

  /**
   * Generate WHERE clause from conditions
   */
  generateWhere(conditions: WhereConditions): SqlResult {
    if (!conditions || Object.keys(conditions).length === 0) {
      return { sql: 'TRUE', params: [] };
    }

    const sql = this.processConditions(conditions);
    return { sql, params: this.params };
  }

  private processConditions(conditions: WhereConditions): string {
    const clauses: string[] = [];

    // Logical operators first
    if (Array.isArray(conditions.AND) && conditions.AND.length > 0) {
      const andClauses = conditions.AND.map((cond) =>
        this.processConditions(cond),
      ).filter((c) => c && c !== 'TRUE');
      if (andClauses.length > 0) {
        clauses.push(`(${andClauses.join(' AND ')})`);
      }
    }

    if (Array.isArray(conditions.OR) && conditions.OR.length > 0) {
      const orClauses = conditions.OR.map((cond) =>
        this.processConditions(cond),
      ).filter((c) => c && c !== 'TRUE');
      if (orClauses.length > 0) {
        clauses.push(`(${orClauses.join(' OR ')})`);
      }
    }

    if (conditions.NOT) {
      const notClause = this.processConditions(conditions.NOT);
      clauses.push(`NOT (${notClause})`);
    }

    // String fields
    if (conditions.versionId !== undefined) {
      clauses.push(
        this.processStringField('r."versionId"', conditions.versionId),
      );
    }
    if (conditions.createdId !== undefined) {
      clauses.push(
        this.processStringField('r."createdId"', conditions.createdId),
      );
    }
    if (conditions.id !== undefined) {
      clauses.push(this.processStringField('r."id"', conditions.id));
    }
    if (conditions.hash !== undefined) {
      clauses.push(this.processStringField('r."hash"', conditions.hash));
    }
    if (conditions.schemaHash !== undefined) {
      clauses.push(
        this.processStringField('r."schemaHash"', conditions.schemaHash),
      );
    }

    // Boolean field
    if (conditions.readonly !== undefined) {
      clauses.push(this.processBoolField('r."readonly"', conditions.readonly));
    }

    // Date fields
    if (conditions.createdAt !== undefined) {
      clauses.push(
        this.processDateField('r."createdAt"', conditions.createdAt),
      );
    }
    if (conditions.updatedAt !== undefined) {
      clauses.push(
        this.processDateField('r."updatedAt"', conditions.updatedAt),
      );
    }
    if (conditions.publishedAt !== undefined) {
      clauses.push(
        this.processDateField('r."publishedAt"', conditions.publishedAt),
      );
    }

    // JSON fields
    if (conditions.data !== undefined) {
      clauses.push(this.processJsonField('r."data"', conditions.data));
    }
    if (conditions.meta !== undefined) {
      clauses.push(this.processJsonField('r."meta"', conditions.meta));
    }

    return clauses.length > 0 ? clauses.join(' AND ') : 'TRUE';
  }

  private processStringField(
    fieldName: string,
    condition: string | StringFilter,
  ): string {
    if (typeof condition === 'string') {
      // Simple equality: { id: "value" }
      return `${fieldName} = ${this.addParam(condition)}`;
    }

    // Complex StringFilter object
    const filter = condition as StringFilter;
    const mode = filter.mode || 'default';
    const isInsensitive = mode === 'insensitive';

    if (filter.equals !== undefined) {
      if (isInsensitive) {
        return `${fieldName} ILIKE ${this.addParam(filter.equals)}`;
      }
      return `${fieldName} = ${this.addParam(filter.equals)}`;
    }

    if (filter.contains !== undefined) {
      const pattern = `%${filter.contains}%`;
      if (isInsensitive) {
        return `${fieldName} ILIKE ${this.addParam(pattern)}`;
      }
      return `${fieldName} LIKE ${this.addParam(pattern)}`;
    }

    if (filter.startsWith !== undefined) {
      const pattern = `${filter.startsWith}%`;
      if (isInsensitive) {
        return `${fieldName} ILIKE ${this.addParam(pattern)}`;
      }
      return `${fieldName} LIKE ${this.addParam(pattern)}`;
    }

    if (filter.endsWith !== undefined) {
      const pattern = `%${filter.endsWith}`;
      if (isInsensitive) {
        return `${fieldName} ILIKE ${this.addParam(pattern)}`;
      }
      return `${fieldName} LIKE ${this.addParam(pattern)}`;
    }

    if (filter.in !== undefined) {
      if (Array.isArray(filter.in) && filter.in.length === 0) return 'FALSE';
      const placeholders = filter.in
        .map((val) => this.addParam(val))
        .join(', ');
      return `${fieldName} IN (${placeholders})`;
    }

    if (filter.notIn !== undefined) {
      if (Array.isArray(filter.notIn) && filter.notIn.length === 0)
        return 'TRUE';
      const placeholders = filter.notIn
        .map((val) => this.addParam(val))
        .join(', ');
      return `${fieldName} NOT IN (${placeholders})`;
    }

    if (filter.gt !== undefined) {
      return `${fieldName} > ${this.addParam(filter.gt)}`;
    }

    if (filter.gte !== undefined) {
      return `${fieldName} >= ${this.addParam(filter.gte)}`;
    }

    if (filter.lt !== undefined) {
      return `${fieldName} < ${this.addParam(filter.lt)}`;
    }

    if (filter.lte !== undefined) {
      return `${fieldName} <= ${this.addParam(filter.lte)}`;
    }

    if (filter.not !== undefined) {
      return `${fieldName} != ${this.addParam(filter.not)}`;
    }

    if (filter.search !== undefined) {
      // PostgreSQL full-text search
      return `to_tsvector('simple', ${fieldName}) @@ plainto_tsquery('simple', ${this.addParam(filter.search)})`;
    }

    throw new Error(`Unsupported StringFilter: ${JSON.stringify(filter)}`);
  }

  private processBoolField(
    fieldName: string,
    condition: boolean | BoolFilter,
  ): string {
    if (typeof condition === 'boolean') {
      return `${fieldName} = ${this.addParam(condition)}`;
    }

    const filter = condition as BoolFilter;
    if (filter.equals !== undefined) {
      return `${fieldName} = ${this.addParam(filter.equals)}`;
    }

    if (filter.not !== undefined) {
      return `${fieldName} != ${this.addParam(filter.not)}`;
    }

    throw new Error(`Unsupported BoolFilter: ${JSON.stringify(filter)}`);
  }

  private processDateField(
    fieldName: string,
    condition: string | Date | DateFilter,
  ): string {
    if (typeof condition === 'string' || condition instanceof Date) {
      const dateStr =
        condition instanceof Date ? condition.toISOString() : condition;
      return `${fieldName} = ${this.addParam(dateStr)}`;
    }

    const filter = condition as DateFilter;
    const clauses: string[] = [];

    if (filter.equals !== undefined) {
      const dateStr =
        filter.equals instanceof Date
          ? filter.equals.toISOString()
          : filter.equals;
      return `${fieldName} = ${this.addParam(dateStr)}`;
    }

    if (filter.gt !== undefined) {
      const dateStr =
        filter.gt instanceof Date ? filter.gt.toISOString() : filter.gt;
      clauses.push(`${fieldName} > ${this.addParam(dateStr)}`);
    }

    if (filter.gte !== undefined) {
      const dateStr =
        filter.gte instanceof Date ? filter.gte.toISOString() : filter.gte;
      clauses.push(`${fieldName} >= ${this.addParam(dateStr)}`);
    }

    if (filter.lt !== undefined) {
      const dateStr =
        filter.lt instanceof Date ? filter.lt.toISOString() : filter.lt;
      clauses.push(`${fieldName} < ${this.addParam(dateStr)}`);
    }

    if (filter.lte !== undefined) {
      const dateStr =
        filter.lte instanceof Date ? filter.lte.toISOString() : filter.lte;
      clauses.push(`${fieldName} <= ${this.addParam(dateStr)}`);
    }

    // Return early if we have basic range conditions
    if (clauses.length > 0) {
      return clauses.join(' AND ');
    }

    if (filter.in !== undefined) {
      if (Array.isArray(filter.in) && filter.in.length === 0) return 'FALSE';
      const dateStrs = filter.in.map((d) =>
        d instanceof Date ? d.toISOString() : d,
      );
      const placeholders = dateStrs.map((d) => this.addParam(d)).join(', ');
      return `${fieldName} IN (${placeholders})`;
    }

    if (filter.notIn !== undefined) {
      if (Array.isArray(filter.notIn) && filter.notIn.length === 0)
        return 'TRUE';
      const dateStrs = filter.notIn.map((d) =>
        d instanceof Date ? d.toISOString() : d,
      );
      const placeholders = dateStrs.map((d) => this.addParam(d)).join(', ');
      return `${fieldName} NOT IN (${placeholders})`;
    }

    throw new Error(`Unsupported DateFilter: ${JSON.stringify(filter)}`);
  }

  private processJsonField(fieldName: string, condition: JsonFilter): string {
    const { path, mode = 'default' } = condition;
    const isInsensitive = mode === 'insensitive';

    // Build JSON path for text operations
    const jsonTextPath =
      path.length === 1
        ? `${fieldName}->>${this.addParam(path[0])}`
        : `${fieldName}#>>${this.addParam(`{${path.join(',')}}`)}`; // PostgreSQL array format

    if (condition.equals !== undefined) {
      if (typeof condition.equals === 'string' && isInsensitive) {
        return `LOWER(${jsonTextPath}) = LOWER(${this.addParam(condition.equals)})`;
      }
      // For string values, compare as text without JSON encoding
      if (typeof condition.equals === 'string') {
        return `${jsonTextPath} = ${this.addParam(condition.equals)}`;
      }
      // For non-string values (numbers, booleans, objects), use JSON comparison
      return `${jsonTextPath} = ${this.addParam(JSON.stringify(condition.equals))}`;
    }

    if (condition.string_contains !== undefined) {
      if (isInsensitive) {
        return `${jsonTextPath} ILIKE ${this.addParam(`%${condition.string_contains}%`)}`;
      }
      return `${jsonTextPath} LIKE ${this.addParam(`%${condition.string_contains}%`)}`;
    }

    if (condition.string_starts_with !== undefined) {
      if (isInsensitive) {
        return `${jsonTextPath} ILIKE ${this.addParam(`${condition.string_starts_with}%`)}`;
      }
      return `${jsonTextPath} LIKE ${this.addParam(`${condition.string_starts_with}%`)}`;
    }

    if (condition.string_ends_with !== undefined) {
      if (isInsensitive) {
        return `${jsonTextPath} ILIKE ${this.addParam(`%${condition.string_ends_with}`)}`;
      }
      return `${jsonTextPath} LIKE ${this.addParam(`%${condition.string_ends_with}`)}`;
    }

    if (condition.gt !== undefined) {
      return `(${jsonTextPath})::numeric > ${this.addParam(condition.gt)}`;
    }

    if (condition.gte !== undefined) {
      return `(${jsonTextPath})::numeric >= ${this.addParam(condition.gte)}`;
    }

    if (condition.lt !== undefined) {
      return `(${jsonTextPath})::numeric < ${this.addParam(condition.lt)}`;
    }

    if (condition.lte !== undefined) {
      return `(${jsonTextPath})::numeric <= ${this.addParam(condition.lte)}`;
    }

    if (condition.array_contains !== undefined) {
      return `${fieldName} @> ${this.addParam(JSON.stringify(condition.array_contains))}`;
    }

    if (condition.in !== undefined) {
      if (Array.isArray(condition.in) && condition.in.length === 0)
        return 'FALSE';
      const placeholders = condition.in
        .map((val) =>
          typeof val === 'string'
            ? this.addParam(val)
            : this.addParam(JSON.stringify(val)),
        )
        .join(', ');
      return `${jsonTextPath} IN (${placeholders})`;
    }

    if (condition.notIn !== undefined) {
      if (Array.isArray(condition.notIn) && condition.notIn.length === 0)
        return 'TRUE';
      const placeholders = condition.notIn
        .map((val) =>
          typeof val === 'string'
            ? this.addParam(val)
            : this.addParam(JSON.stringify(val)),
        )
        .join(', ');
      return `${jsonTextPath} NOT IN (${placeholders})`;
    }

    if (condition.not !== undefined) {
      // Prisma-style NOT: exclude nulls and non-matching values
      if (typeof condition.not === 'string') {
        return `(${jsonTextPath} IS NOT NULL AND ${jsonTextPath} != ${this.addParam(condition.not)})`;
      }
      return `(${jsonTextPath} IS NOT NULL AND ${jsonTextPath} != ${this.addParam(JSON.stringify(condition.not))})`;
    }

    throw new Error(`Unsupported JsonFilter: ${JSON.stringify(condition)}`);
  }

  /**
   * Generate ORDER BY clause from order conditions
   */
  generateOrderBy(orderBy?: RowOrderInput[]): string {
    if (!orderBy || orderBy.length === 0) {
      return 'r."createdAt" DESC'; // Default ordering
    }

    const orderClauses: string[] = [];

    for (const orderItem of orderBy) {
      for (const [field, direction] of Object.entries(orderItem)) {
        const sortOrder = direction.toUpperCase();
        const fieldMapping = this.getFieldMapping(field);
        orderClauses.push(`${fieldMapping} ${sortOrder}`);
      }
    }

    return orderClauses.length > 0
      ? orderClauses.join(', ')
      : 'r."createdAt" DESC'; // Fallback to default
  }

  /**
   * Map field names to SQL column references
   */
  private getFieldMapping(fieldName: string): string {
    const fieldMappings: Record<string, string> = {
      versionId: 'r."versionId"',
      createdId: 'r."createdId"',
      id: 'r."id"',
      readonly: 'r."readonly"',
      createdAt: 'r."createdAt"',
      updatedAt: 'r."updatedAt"',
      publishedAt: 'r."publishedAt"',
      data: 'r."data"',
      meta: 'r."meta"',
      hash: 'r."hash"',
      schemaHash: 'r."schemaHash"',
    };

    const mapping = fieldMappings[fieldName];
    if (!mapping) {
      throw new Error(`Unsupported ORDER BY field: ${fieldName}`);
    }

    return mapping;
  }
}

/**
 * Helper function to generate complete getRows query with timing information
 */
export function generateGetRowsQuery(
  tableId: string,
  take: number,
  skip: number,
  whereConditions?: WhereConditions,
  orderBy?: RowOrderInput[],
): SqlResult {
  const whereGenerator = new WhereGenerator(4); // Start from $4 since $1-$3 are already used
  const whereClause = whereConditions
    ? whereGenerator.generateWhere(whereConditions)
    : { sql: 'TRUE', params: [] };

  const orderByClause = whereGenerator.generateOrderBy(orderBy);

  const sql = `
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
INNER JOIN "_RowToTable" rt ON rt."A" = r."versionId"
WHERE rt."B" = $1 
  AND (${whereClause.sql})
ORDER BY ${orderByClause}
LIMIT $2
OFFSET $3
  `.trim();

  return {
    sql,
    params: [tableId, take, skip, ...whereClause.params],
  };
}

/**
 * Helper function to generate query with performance timing
 */
export function generateGetRowsQueryWithTiming(
  tableId: string,
  take: number,
  skip: number,
  whereConditions?: WhereConditions,
): SqlResult & { generationTimeMs: number } {
  const startTime = process.hrtime.bigint();

  const result = generateGetRowsQuery(tableId, take, skip, whereConditions);

  const endTime = process.hrtime.bigint();
  const generationTimeMs = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

  return {
    ...result,
    generationTimeMs,
  };
}
