// Types matching the existing where-generator.ts interface
import {
  WhereConditions as BaseWhereConditions,
  StringFilter,
  BoolFilter,
  DateFilter,
  JsonFilter,
  SqlResult,
} from '../sql-generator/types';

// Re-export the exact same types for compatibility
export type WhereConditions = BaseWhereConditions;
export type { StringFilter, BoolFilter, DateFilter, JsonFilter, SqlResult };

export interface JsonOrderInput {
  path: string | string[];
  direction?: 'asc' | 'desc';
  type?: JsonValueType;
  aggregation?: JsonAggregation;
  subPath?: string;
}

export interface RowOrderInput {
  versionId?: 'asc' | 'desc';
  createdId?: 'asc' | 'desc';
  id?: 'asc' | 'desc';
  readonly?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
  publishedAt?: 'asc' | 'desc';
  data?: 'asc' | 'desc' | JsonOrderInput;
  meta?: 'asc' | 'desc' | JsonOrderInput;
  hash?: 'asc' | 'desc';
  schemaHash?: 'asc' | 'desc';
}

export type JsonValueType = 'text' | 'int' | 'float' | 'boolean' | 'timestamp';
export type JsonAggregation = 'min' | 'max' | 'avg' | 'first' | 'last';

// Parameters for the main query function
export interface GetRowsQueryParams {
  tableId: string;
  take: number;
  skip: number;
  whereConditions?: WhereConditions;
  orderBy?: RowOrderInput[];
}

// Return type for rendered queries
export interface RenderedQuery {
  sql: string;
  params: any[];
}

// New Prisma-style options interface
export interface GetRowsOptions {
  take?: number; // default 50, clamp 1..500
  skip?: number; // default 0, clamp >= 0
  orderBy?: RowOrderInput | RowOrderInput[];
  where?: WhereConditions;
}
