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

export interface SqlResult {
  sql: string;
  params: any[];
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

export interface DateFilter {
  equals?: string | Date;
  gt?: string | Date;
  gte?: string | Date;
  lt?: string | Date;
  lte?: string | Date;
  in?: (string | Date)[];
  notIn?: (string | Date)[];
}

export interface BoolFilter {
  equals?: boolean;
  not?: boolean;
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
