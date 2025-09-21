import { Prisma } from '@prisma/client';
import {
  WhereConditions,
  StringFilter,
  BoolFilter,
  DateFilter,
  JsonFilter,
  GetRowsOptions,
  RowOrderInput,
} from './types';
import {
  parseJsonPath,
  getSqlType,
  validateJsonPath,
  hasArrayWildcard,
  buildJsonPathParam,
  handleArrayAggregation,
  splitPathAtWildcard,
} from './json-path';

/**
 * Main WHERE clause generator using Prisma.sql template literals
 * This is a complete rewrite of the existing where-generator.ts using Prisma.sql approach
 */
export class WhereGeneratorPrisma {
  /**
   * Generates WHERE clause using Prisma.sql template literals
   * Returns Prisma.Sql node instead of {sql, params}
   */
  generateWhere(conditions?: WhereConditions): Prisma.Sql {
    if (!conditions || Object.keys(conditions).length === 0) {
      return Prisma.sql`TRUE`;
    }

    return this.processConditions(conditions);
  }

  /**
   * Process conditions and combine them with AND
   */
  private processConditions(conditions: WhereConditions): Prisma.Sql {
    const clauses: Prisma.Sql[] = [];

    if (Array.isArray(conditions.AND) && conditions.AND.length > 0) {
      const andClauses = conditions.AND.map((cond) =>
        this.processConditions(cond),
      ).filter((c) => c.inspect().sql !== 'TRUE');
      if (andClauses.length > 0) {
        clauses.push(Prisma.sql`(${this.combineWithAnd(andClauses)})`);
      }
    }

    if (Array.isArray(conditions.OR) && conditions.OR.length > 0) {
      const orClauses = conditions.OR.map((cond) =>
        this.processConditions(cond),
      ).filter((c) => c.inspect().sql !== 'TRUE');
      if (orClauses.length > 0) {
        clauses.push(Prisma.sql`(${this.combineWithOr(orClauses)})`);
      }
    }

    if (conditions.NOT) {
      const notClause = this.processConditions(conditions.NOT);
      clauses.push(Prisma.sql`NOT (${notClause})`);
    }

    if (conditions.versionId !== undefined) {
      clauses.push(this.processStringField('versionId', conditions.versionId));
    }
    if (conditions.createdId !== undefined) {
      clauses.push(this.processStringField('createdId', conditions.createdId));
    }
    if (conditions.id !== undefined) {
      clauses.push(this.processStringField('id', conditions.id));
    }
    if (conditions.hash !== undefined) {
      clauses.push(this.processStringField('hash', conditions.hash));
    }
    if (conditions.schemaHash !== undefined) {
      clauses.push(
        this.processStringField('schemaHash', conditions.schemaHash),
      );
    }

    if (conditions.readonly !== undefined) {
      clauses.push(this.processBoolField('readonly', conditions.readonly));
    }

    if (conditions.createdAt !== undefined) {
      clauses.push(this.processDateField('createdAt', conditions.createdAt));
    }
    if (conditions.updatedAt !== undefined) {
      clauses.push(this.processDateField('updatedAt', conditions.updatedAt));
    }
    if (conditions.publishedAt !== undefined) {
      clauses.push(
        this.processDateField('publishedAt', conditions.publishedAt),
      );
    }

    if (conditions.data !== undefined) {
      clauses.push(this.processJsonField('data', conditions.data));
    }
    if (conditions.meta !== undefined) {
      clauses.push(this.processJsonField('meta', conditions.meta));
    }

    if (clauses.length === 0) {
      return Prisma.sql`TRUE`;
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    // Combine multiple clauses with AND
    return this.combineWithAnd(clauses);
  }

  /**
   * Combine multiple SQL clauses with AND
   */
  private combineWithAnd(clauses: Prisma.Sql[]): Prisma.Sql {
    if (clauses.length === 0) {
      return Prisma.sql`TRUE`;
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    // Build: clause1 AND clause2 AND clause3...
    let result = clauses[0];
    for (let i = 1; i < clauses.length; i++) {
      result = Prisma.sql`${result} AND ${clauses[i]}`;
    }
    return result;
  }

  /**
   * Combine multiple SQL clauses with OR
   */
  private combineWithOr(clauses: Prisma.Sql[]): Prisma.Sql {
    if (clauses.length === 0) {
      return Prisma.sql`FALSE`;
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    // Build: clause1 OR clause2 OR clause3...
    let result = clauses[0];
    for (let i = 1; i < clauses.length; i++) {
      result = Prisma.sql`${result} OR ${clauses[i]}`;
    }
    return result;
  }

  /**
   * Generates ORDER BY clause using Prisma.sql template literals
   */
  generateOrderBy(orderBy?: any[]): Prisma.Sql {
    if (!orderBy || orderBy.length === 0) {
      return Prisma.sql`r."createdAt" DESC`;
    }

    const orderClauses: Prisma.Sql[] = [];

    for (const orderItem of orderBy) {
      for (const [field, direction] of Object.entries(orderItem)) {
        if (typeof direction === 'string') {
          const fieldRef = this.getFieldReference(field);
          const sortOrder = Prisma.raw(direction.toUpperCase());
          orderClauses.push(Prisma.sql`${fieldRef} ${sortOrder}`);
        } else if (typeof direction === 'object' && direction !== null) {
          const jsonOrderClause = this.generateJsonOrderBy(field, direction);
          orderClauses.push(jsonOrderClause);
        }
      }
    }

    return orderClauses.length > 0
      ? this.combineOrderBy(orderClauses)
      : Prisma.sql`r."createdAt" DESC`;
  }

  /**
   * Processes string field conditions
   */
  private processStringField(
    field: string,
    condition: string | StringFilter,
  ): Prisma.Sql {
    const fieldRef = Prisma.raw(`r."${field}"`);

    if (typeof condition === 'string') {
      // Simple equality: { id: "value" }
      return Prisma.sql`${fieldRef} = ${condition}`;
    }

    // Complex StringFilter object
    const filter = condition as StringFilter;
    const mode = filter.mode || 'default';
    const isInsensitive = mode === 'insensitive';

    if (filter.equals !== undefined) {
      if (isInsensitive) {
        return Prisma.sql`${fieldRef} ILIKE ${filter.equals}`;
      }
      return Prisma.sql`${fieldRef} = ${filter.equals}`;
    }

    if (filter.contains !== undefined) {
      const pattern = `%${filter.contains}%`;
      if (isInsensitive) {
        return Prisma.sql`${fieldRef} ILIKE ${pattern}`;
      }
      return Prisma.sql`${fieldRef} LIKE ${pattern}`;
    }

    if (filter.startsWith !== undefined) {
      const pattern = `${filter.startsWith}%`;
      if (isInsensitive) {
        return Prisma.sql`${fieldRef} ILIKE ${pattern}`;
      }
      return Prisma.sql`${fieldRef} LIKE ${pattern}`;
    }

    if (filter.endsWith !== undefined) {
      const pattern = `%${filter.endsWith}`;
      if (isInsensitive) {
        return Prisma.sql`${fieldRef} ILIKE ${pattern}`;
      }
      return Prisma.sql`${fieldRef} LIKE ${pattern}`;
    }

    if (filter.in !== undefined) {
      if (Array.isArray(filter.in) && filter.in.length === 0) {
        return Prisma.sql`FALSE`;
      }
      return Prisma.sql`${fieldRef} IN (${Prisma.join(filter.in)})`;
    }

    if (filter.notIn !== undefined) {
      if (Array.isArray(filter.notIn) && filter.notIn.length === 0) {
        return Prisma.sql`TRUE`;
      }
      return Prisma.sql`${fieldRef} NOT IN (${Prisma.join(filter.notIn)})`;
    }

    if (filter.gt !== undefined) {
      return Prisma.sql`${fieldRef} > ${filter.gt}`;
    }

    if (filter.gte !== undefined) {
      return Prisma.sql`${fieldRef} >= ${filter.gte}`;
    }

    if (filter.lt !== undefined) {
      return Prisma.sql`${fieldRef} < ${filter.lt}`;
    }

    if (filter.lte !== undefined) {
      return Prisma.sql`${fieldRef} <= ${filter.lte}`;
    }

    if (filter.not !== undefined) {
      return Prisma.sql`${fieldRef} != ${filter.not}`;
    }

    if (filter.search !== undefined) {
      // PostgreSQL full-text search with additional validation
      if (typeof filter.search !== 'string') {
        throw new Error('Full-text search term must be a string');
      }
      if (filter.search.length > 1000) {
        throw new Error('Full-text search term too long (max 1000 characters)');
      }
      // Use plainto_tsquery for safe search term processing (handles special characters)
      return Prisma.sql`to_tsvector('simple', ${fieldRef}) @@ plainto_tsquery('simple', ${filter.search})`;
    }

    throw new Error(`Unsupported StringFilter: ${JSON.stringify(filter)}`);
  }

  /**
   * Processes boolean field conditions
   */
  private processBoolField(
    field: string,
    condition: boolean | BoolFilter,
  ): Prisma.Sql {
    const fieldRef = Prisma.raw(`r."${field}"`);

    if (typeof condition === 'boolean') {
      return Prisma.sql`${fieldRef} = ${condition}`;
    }

    const filter = condition as BoolFilter;
    if (filter.equals !== undefined) {
      return Prisma.sql`${fieldRef} = ${filter.equals}`;
    }

    if (filter.not !== undefined) {
      return Prisma.sql`${fieldRef} != ${filter.not}`;
    }

    throw new Error(`Unsupported BoolFilter: ${JSON.stringify(filter)}`);
  }

  /**
   * Processes date field conditions
   */
  private processDateField(
    field: string,
    condition: string | Date | DateFilter,
  ): Prisma.Sql {
    const fieldRef = Prisma.raw(`r."${field}"`);

    if (typeof condition === 'string' || condition instanceof Date) {
      const dateStr =
        condition instanceof Date ? condition.toISOString() : condition;
      return Prisma.sql`${fieldRef} = ${dateStr}::timestamp`;
    }

    const filter = condition as DateFilter;
    const clauses: Prisma.Sql[] = [];

    if (filter.equals !== undefined) {
      const dateStr =
        filter.equals instanceof Date
          ? filter.equals.toISOString()
          : filter.equals;
      return Prisma.sql`${fieldRef} = ${dateStr}::timestamp`;
    }

    if (filter.gt !== undefined) {
      const dateStr =
        filter.gt instanceof Date ? filter.gt.toISOString() : filter.gt;
      clauses.push(Prisma.sql`${fieldRef} > ${dateStr}::timestamp`);
    }

    if (filter.gte !== undefined) {
      const dateStr =
        filter.gte instanceof Date ? filter.gte.toISOString() : filter.gte;
      clauses.push(Prisma.sql`${fieldRef} >= ${dateStr}::timestamp`);
    }

    if (filter.lt !== undefined) {
      const dateStr =
        filter.lt instanceof Date ? filter.lt.toISOString() : filter.lt;
      clauses.push(Prisma.sql`${fieldRef} < ${dateStr}::timestamp`);
    }

    if (filter.lte !== undefined) {
      const dateStr =
        filter.lte instanceof Date ? filter.lte.toISOString() : filter.lte;
      clauses.push(Prisma.sql`${fieldRef} <= ${dateStr}::timestamp`);
    }

    // Return early if we have basic range conditions
    if (clauses.length > 0) {
      return this.combineWithAnd(clauses);
    }

    if (filter.in !== undefined) {
      if (Array.isArray(filter.in) && filter.in.length === 0) {
        return Prisma.sql`FALSE`;
      }
      const dateStrs = filter.in.map((d) =>
        d instanceof Date ? d.toISOString() : d,
      );
      const castDates = dateStrs.map((d) => Prisma.sql`${d}::timestamp`);
      return Prisma.sql`${fieldRef} IN (${Prisma.join(castDates)})`;
    }

    if (filter.notIn !== undefined) {
      if (Array.isArray(filter.notIn) && filter.notIn.length === 0) {
        return Prisma.sql`TRUE`;
      }
      const dateStrs = filter.notIn.map((d) =>
        d instanceof Date ? d.toISOString() : d,
      );
      const castDates = dateStrs.map((d) => Prisma.sql`${d}::timestamp`);
      return Prisma.sql`${fieldRef} NOT IN (${Prisma.join(castDates)})`;
    }

    throw new Error(`Unsupported DateFilter: ${JSON.stringify(filter)}`);
  }

  /**
   * Processes JSON field conditions (data, meta)
   */
  private processJsonField(field: string, condition: JsonFilter): Prisma.Sql {
    const fieldRef = Prisma.raw(`r."${field}"`);
    const { path, mode = 'default' } = condition;
    const isInsensitive = mode === 'insensitive';

    // Build JSON path for text operations
    // Single path: field->>$1, Multiple paths: field#>>$1 with array format {path1,path2}
    const pathParam = path.length === 1 ? path[0] : `{${path.join(',')}}`;
    const jsonTextPath =
      path.length === 1
        ? Prisma.sql`${fieldRef}->>${pathParam}`
        : Prisma.sql`${fieldRef}#>>${pathParam}`;

    if (condition.equals !== undefined) {
      if (typeof condition.equals === 'string' && isInsensitive) {
        return Prisma.sql`LOWER(${jsonTextPath}) = LOWER(${condition.equals})`;
      }
      // For string values, compare as text without JSON encoding
      if (typeof condition.equals === 'string') {
        return Prisma.sql`${jsonTextPath} = ${condition.equals}`;
      }
      // For non-string values (numbers, booleans, objects), use JSON comparison
      const jsonValue = JSON.stringify(condition.equals);
      return Prisma.sql`${jsonTextPath} = ${jsonValue}`;
    }

    if (condition.string_contains !== undefined) {
      const pattern = `%${condition.string_contains}%`;
      if (isInsensitive) {
        return Prisma.sql`${jsonTextPath} ILIKE ${pattern}`;
      }
      return Prisma.sql`${jsonTextPath} LIKE ${pattern}`;
    }

    if (condition.string_starts_with !== undefined) {
      const pattern = `${condition.string_starts_with}%`;
      if (isInsensitive) {
        return Prisma.sql`${jsonTextPath} ILIKE ${pattern}`;
      }
      return Prisma.sql`${jsonTextPath} LIKE ${pattern}`;
    }

    if (condition.string_ends_with !== undefined) {
      const pattern = `%${condition.string_ends_with}`;
      if (isInsensitive) {
        return Prisma.sql`${jsonTextPath} ILIKE ${pattern}`;
      }
      return Prisma.sql`${jsonTextPath} LIKE ${pattern}`;
    }

    if (condition.gt !== undefined) {
      return Prisma.sql`(${jsonTextPath})::numeric > ${condition.gt}`;
    }

    if (condition.gte !== undefined) {
      return Prisma.sql`(${jsonTextPath})::numeric >= ${condition.gte}`;
    }

    if (condition.lt !== undefined) {
      return Prisma.sql`(${jsonTextPath})::numeric < ${condition.lt}`;
    }

    if (condition.lte !== undefined) {
      return Prisma.sql`(${jsonTextPath})::numeric <= ${condition.lte}`;
    }

    if (condition.array_contains !== undefined) {
      // Enhanced array_contains implementation with case-insensitive support
      // This is better than Prisma ORM which ignores mode: 'insensitive' for array_contains
      const pathArray = path.map((p) => String(p));
      const arrayPath = Prisma.sql`ARRAY[${Prisma.join(pathArray)}]::text[]`;

      if (isInsensitive && typeof condition.array_contains === 'string') {
        // Case-insensitive string array_contains using EXISTS with LOWER() comparison
        return Prisma.sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text((${fieldRef}#>${arrayPath})::jsonb) AS elem
          WHERE LOWER(elem) = LOWER(${condition.array_contains})
        ) AND JSONB_TYPEOF((${fieldRef}#>${arrayPath})::jsonb) = 'array'`;
      }

      // Standard case-sensitive array_contains using @> operator
      const jsonValue = JSON.stringify(condition.array_contains);
      return Prisma.sql`(${fieldRef}#>${arrayPath})::jsonb @> ${jsonValue}::jsonb AND JSONB_TYPEOF((${fieldRef}#>${arrayPath})::jsonb) = 'array'`;
    }

    if (condition.array_starts_with !== undefined) {
      // Prisma pattern: (field#>ARRAY[path]::text[])::jsonb->0)::jsonb = value
      const pathArray = path.map((p) => String(p));
      const arrayPath = Prisma.sql`ARRAY[${Prisma.join(pathArray)}]::text[]`;
      const jsonValue = JSON.stringify(condition.array_starts_with);

      if (isInsensitive && typeof condition.array_starts_with === 'string') {
        // Case-insensitive first element comparison
        // Note: jsonb->0 returns JSON value with quotes, so we need to add quotes to search term
        const quotedValue = JSON.stringify(condition.array_starts_with);
        return Prisma.sql`LOWER(((${fieldRef}#>${arrayPath})::jsonb->0)::text) = LOWER(${quotedValue}) AND JSONB_TYPEOF((${fieldRef}#>${arrayPath})::jsonb) = 'array'`;
      }

      return Prisma.sql`((${fieldRef}#>${arrayPath})::jsonb->0)::jsonb = ${jsonValue}::jsonb AND JSONB_TYPEOF((${fieldRef}#>${arrayPath})::jsonb) = 'array'`;
    }

    if (condition.array_ends_with !== undefined) {
      // Prisma pattern: (field#>ARRAY[path]::text[])::jsonb->-1)::jsonb = value
      const pathArray = path.map((p) => String(p));
      const arrayPath = Prisma.sql`ARRAY[${Prisma.join(pathArray)}]::text[]`;
      const jsonValue = JSON.stringify(condition.array_ends_with);

      if (isInsensitive && typeof condition.array_ends_with === 'string') {
        // Case-insensitive last element comparison
        // Note: jsonb->-1 returns JSON value with quotes, so we need to add quotes to search term
        const quotedValue = JSON.stringify(condition.array_ends_with);
        return Prisma.sql`LOWER(((${fieldRef}#>${arrayPath})::jsonb->-1)::text) = LOWER(${quotedValue}) AND JSONB_TYPEOF((${fieldRef}#>${arrayPath})::jsonb) = 'array'`;
      }

      return Prisma.sql`((${fieldRef}#>${arrayPath})::jsonb->-1)::jsonb = ${jsonValue}::jsonb AND JSONB_TYPEOF((${fieldRef}#>${arrayPath})::jsonb) = 'array'`;
    }

    if (condition.in !== undefined) {
      if (Array.isArray(condition.in) && condition.in.length === 0) {
        return Prisma.sql`FALSE`;
      }
      const values = condition.in.map((val) =>
        typeof val === 'string' ? val : JSON.stringify(val),
      );
      return Prisma.sql`${jsonTextPath} IN (${Prisma.join(values)})`;
    }

    if (condition.notIn !== undefined) {
      if (Array.isArray(condition.notIn) && condition.notIn.length === 0) {
        return Prisma.sql`TRUE`;
      }
      const values = condition.notIn.map((val) =>
        typeof val === 'string' ? val : JSON.stringify(val),
      );
      return Prisma.sql`${jsonTextPath} NOT IN (${Prisma.join(values)})`;
    }

    if (condition.not !== undefined) {
      if (typeof condition.not === 'string') {
        return Prisma.sql`${jsonTextPath} != ${condition.not}`;
      }
      const jsonValue = JSON.stringify(condition.not);
      return Prisma.sql`${jsonTextPath} != ${jsonValue}`;
    }

    throw new Error(`Unsupported JsonFilter: ${JSON.stringify(condition)}`);
  }

  /**
   * Valid fields for ORDER BY operations
   */
  private static readonly VALID_ORDER_FIELDS = new Set([
    'versionId',
    'createdId',
    'id',
    'hash',
    'schemaHash',
    'readonly',
    'createdAt',
    'updatedAt',
    'publishedAt',
    'data',
    'meta',
  ]);

  /**
   * Get field reference for ORDER BY with validation
   */
  private getFieldReference(fieldName: string): Prisma.Sql {
    if (!WhereGeneratorPrisma.VALID_ORDER_FIELDS.has(fieldName)) {
      throw new Error(
        `Invalid ORDER BY field: ${fieldName}. Allowed fields: ${Array.from(WhereGeneratorPrisma.VALID_ORDER_FIELDS).join(', ')}`,
      );
    }
    return Prisma.raw(`r."${fieldName}"`);
  }

  /**
   * Combine multiple ORDER BY clauses
   */
  private combineOrderBy(clauses: Prisma.Sql[]): Prisma.Sql {
    if (clauses.length === 0) {
      return Prisma.sql`r."createdAt" DESC`;
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    // Build: clause1, clause2, clause3...
    let result = clauses[0];
    for (let i = 1; i < clauses.length; i++) {
      result = Prisma.sql`${result}, ${clauses[i]}`;
    }
    return result;
  }

  /**
   * Generate JSON ORDER BY clause
   */
  private generateJsonOrderBy(field: string, jsonOrder: any): Prisma.Sql {
    const {
      path,
      direction = 'asc',
      type = 'text',
      aggregation = 'first',
    } = jsonOrder;
    const fieldRef = Prisma.raw(`r."${field}"`);
    const sortOrder = Prisma.raw(direction.toUpperCase());

    // Parse JSON path - handle both string and array formats
    const pgPath = typeof path === 'string' ? parseJsonPath(path) : path;
    validateJsonPath(pgPath);

    // Check if path contains wildcard for array aggregation
    if (hasArrayWildcard(path) || aggregation !== 'first') {
      return this.generateArrayAggregationOrder(
        fieldRef,
        pgPath,
        type,
        aggregation,
        sortOrder,
      );
    }

    // Simple path access: (r."data"#>>'{path,subpath}')::type ORDER
    const pathParam = Prisma.raw(`'${buildJsonPathParam(pgPath)}'`);
    const sqlType = getSqlType(type);

    return Prisma.sql`(${fieldRef}#>>${pathParam})::${Prisma.raw(sqlType)} ${sortOrder}`;
  }

  // JSON path parsing methods moved to json-path.ts utility

  /**
   * Generate array aggregation ORDER BY for paths with [*] wildcard (Advanced feature)
   */
  private generateArrayAggregationOrder(
    fieldRef: Prisma.Sql,
    pgPath: string[],
    type: string,
    aggregation: string,
    sortOrder: Prisma.Sql,
  ): Prisma.Sql {
    const sqlType = getSqlType(type);
    const { beforeStar, afterStar, starIndex } = splitPathAtWildcard(pgPath);

    if (starIndex === -1) {
      // No * found, treat as aggregation with index
      const modifiedPath = handleArrayAggregation(pgPath, aggregation as any);
      const pathParam = Prisma.raw(`'${buildJsonPathParam(modifiedPath)}'`);
      return Prisma.sql`(${fieldRef}#>>${pathParam})::${Prisma.raw(sqlType)} ${sortOrder}`;
    }

    // Generate proper SQL aggregation for array wildcards
    const arrayPath = Prisma.raw(`'${buildJsonPathParam(beforeStar)}'`);

    switch (aggregation) {
      case 'min':
        if (afterStar.length > 0) {
          const subPath = Prisma.raw(`'${buildJsonPathParam(afterStar)}'`);
          return Prisma.sql`(SELECT MIN((value#>>${subPath})::${Prisma.raw(sqlType)}) FROM jsonb_array_elements(${fieldRef}#>${arrayPath}) AS value) ${sortOrder}`;
        } else {
          return Prisma.sql`(SELECT MIN(value::${Prisma.raw(sqlType)}) FROM jsonb_array_elements_text(${fieldRef}#>${arrayPath}) AS value) ${sortOrder}`;
        }

      case 'max':
        if (afterStar.length > 0) {
          const subPath = Prisma.raw(`'${buildJsonPathParam(afterStar)}'`);
          return Prisma.sql`(SELECT MAX((value#>>${subPath})::${Prisma.raw(sqlType)}) FROM jsonb_array_elements(${fieldRef}#>${arrayPath}) AS value) ${sortOrder}`;
        } else {
          return Prisma.sql`(SELECT MAX(value::${Prisma.raw(sqlType)}) FROM jsonb_array_elements_text(${fieldRef}#>${arrayPath}) AS value) ${sortOrder}`;
        }

      case 'avg':
        if (afterStar.length > 0) {
          const subPath = Prisma.raw(`'${buildJsonPathParam(afterStar)}'`);
          return Prisma.sql`(SELECT AVG((value#>>${subPath})::${Prisma.raw(sqlType)}) FROM jsonb_array_elements(${fieldRef}#>${arrayPath}) AS value) ${sortOrder}`;
        } else {
          return Prisma.sql`(SELECT AVG(value::${Prisma.raw(sqlType)}) FROM jsonb_array_elements_text(${fieldRef}#>${arrayPath}) AS value) ${sortOrder}`;
        }

      case 'last': {
        // Use negative index for last element
        const lastPath = [...beforeStar, '-1', ...afterStar];
        const pathParam = Prisma.raw(`'${buildJsonPathParam(lastPath)}'`);
        return Prisma.sql`(${fieldRef}#>>${pathParam})::${Prisma.raw(sqlType)} ${sortOrder}`;
      }

      case 'first':
      default: {
        // Use index 0 for first element
        const firstPath = [...beforeStar, '0', ...afterStar];
        const pathParam = Prisma.raw(`'${buildJsonPathParam(firstPath)}'`);
        return Prisma.sql`(${fieldRef}#>>${pathParam})::${Prisma.raw(sqlType)} ${sortOrder}`;
      }
    }
  }

  /**
   * NEW: Prisma-style convenient contract
   * Generates complete getRows query with normalized options
   */
  generateGetRowsQueryPrisma(
    tableId: string,
    options: GetRowsOptions = {},
  ): Prisma.Sql {
    // Normalize and clamp options
    const takeNum = Number(options.take ?? 50);
    const take = Math.max(1, Math.min(500, isNaN(takeNum) ? 50 : takeNum));
    const skipNum = Number(options.skip ?? 0);
    const skip = Math.max(0, isNaN(skipNum) ? 0 : skipNum);
    const orderByArray = Array.isArray(options.orderBy)
      ? options.orderBy
      : options.orderBy
        ? [options.orderBy]
        : [];

    // Generate SQL parts
    const whereSql = this.generateWhere(options.where || {});
    const orderSql = this.generateOrderBy(orderByArray);

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
      INNER JOIN "_RowToTable" rt ON rt."A" = r."versionId"
      WHERE rt."B" = ${tableId}
        AND ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${take}
      OFFSET ${skip}
    `;
  }

  /**
   * Legacy low-level method for compatibility
   */
  generateGetRowsQuery(
    tableId: string,
    take: number,
    skip: number,
    whereConditions?: WhereConditions,
    orderBy?: RowOrderInput[],
  ): Prisma.Sql {
    return this.generateGetRowsQueryPrisma(tableId, {
      take,
      skip,
      where: whereConditions,
      orderBy,
    });
  }
}

/**
 * Main entry point function - generates complete getRows query
 * This replaces the existing generateGetRowsQuery function
 */
export function generateGetRowsQueryPrisma(
  tableId: string,
  take: number,
  skip: number,
  whereConditions?: WhereConditions,
  orderBy?: any[],
): Prisma.Sql {
  const generator = new WhereGeneratorPrisma();
  const whereClause = generator.generateWhere(whereConditions || {});
  const orderByClause = generator.generateOrderBy(orderBy || []);

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
    ORDER BY ${orderByClause}
    LIMIT ${take}
    OFFSET ${skip}
  `;
}
