/**
 * Type definitions for SQL WHERE clause generation
 * Based on Prisma FilterVisitor patterns but simplified for our use case
 */

export interface WhereConditions {
  // String fields
  versionId?: string | StringFilter;
  createdId?: string | StringFilter;
  id?: string | StringFilter;
  hash?: string | StringFilter;
  schemaHash?: string | StringFilter;

  // Boolean field
  readonly?: boolean | BoolFilter;

  // Date fields
  createdAt?: string | Date | DateFilter;
  updatedAt?: string | Date | DateFilter;
  publishedAt?: string | Date | DateFilter;

  // JSON fields
  data?: JsonFilter;
  meta?: JsonFilter;

  // Logical operators
  AND?: WhereConditions[];
  OR?: WhereConditions[];
  NOT?: WhereConditions;
}

export interface StringFilter {
  equals?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  in?: string[];
  notIn?: string[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  not?: string;
  search?: string;
  mode?: 'default' | 'insensitive';
}

export interface BoolFilter {
  equals?: boolean;
  not?: boolean;
}

export interface DateFilter {
  equals?: string | Date;
  gt?: string | Date;
  gte?: string | Date;
  lt?: string | Date;
  lte?: string | Date;
  in?: (string | Date)[];
  notIn?: (string | Date)[];
}

export interface JsonFilter {
  path: string[];
  equals?: any;
  string_contains?: string;
  string_starts_with?: string;
  string_ends_with?: string;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: any[];
  notIn?: any[];
  array_contains?: any;
  array_starts_with?: any;
  array_ends_with?: any;
  not?: any;
  mode?: 'default' | 'insensitive';
}

export type SortOrder = 'asc' | 'desc';

export type JsonValueType = 'text' | 'int' | 'float' | 'boolean' | 'timestamp';

export type JsonAggregation = 'min' | 'max' | 'avg' | 'first' | 'last';

export interface JsonOrderInput {
  path: string; // JSON path like "$.arr[*].price" or "name" or "user.age"
  direction: SortOrder;
  type: JsonValueType; // Type for proper casting in SQL
  aggregation?: JsonAggregation; // How to aggregate array values (default: 'first')
}

export interface RowOrderInput {
  versionId?: SortOrder;
  createdId?: SortOrder;
  id?: SortOrder;
  readonly?: SortOrder;
  createdAt?: SortOrder;
  updatedAt?: SortOrder;
  publishedAt?: SortOrder;
  data?: SortOrder | JsonOrderInput;
  meta?: SortOrder | JsonOrderInput;
  hash?: SortOrder;
  schemaHash?: SortOrder;
}

export interface SqlResult {
  sql: string;
  params: any[];
}
