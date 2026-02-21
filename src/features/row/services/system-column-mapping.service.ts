import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/__generated__/client';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import {
  JsonFilter,
  JsonOrderByInput,
  OrderByConditions,
} from '@revisium/prisma-pg-json';
import {
  JsonObjectSchema,
  JsonSchema,
  JsonSchemaTypeName,
} from '@revisium/schema-toolkit/types';

const SYSTEM_SCHEMA_TO_COLUMN: Record<string, string> = {
  [SystemSchemaIds.RowId]: 'id',
  [SystemSchemaIds.RowCreatedId]: 'createdId',
  [SystemSchemaIds.RowVersionId]: 'versionId',
  [SystemSchemaIds.RowCreatedAt]: 'createdAt',
  [SystemSchemaIds.RowUpdatedAt]: 'updatedAt',
  [SystemSchemaIds.RowPublishedAt]: 'publishedAt',
};

const JSON_FILTER_KEY_MAP: Record<string, string> = {
  string_contains: 'contains',
  string_starts_with: 'startsWith',
  string_ends_with: 'endsWith',
};

function isRefSchema(schema: JsonSchema): schema is { $ref: string } {
  return '$ref' in schema;
}

function isObjectSchema(schema: JsonSchema): schema is JsonObjectSchema {
  if (isRefSchema(schema)) {
    return false;
  }
  return schema.type === JsonSchemaTypeName.Object;
}

function hasPath(value: unknown): value is { path: string | string[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    (typeof value.path === 'string' || Array.isArray(value.path))
  );
}

@Injectable()
export class SystemColumnMappingService {
  public mapWhereConditions(
    where: Prisma.RowWhereInput | undefined,
    schema: JsonSchema,
  ): Prisma.RowWhereInput | undefined {
    if (!where) {
      return undefined;
    }
    return this.processWhereConditions(where, schema);
  }

  public mapOrderByConditions(
    orderBy: OrderByConditions[] | undefined,
    schema: JsonSchema,
  ): OrderByConditions[] | undefined {
    if (!orderBy || orderBy.length === 0) {
      return undefined;
    }
    return orderBy.map((condition) =>
      this.processOrderByCondition(condition, schema),
    );
  }

  private processWhereConditions(
    where: Prisma.RowWhereInput,
    schema: JsonSchema,
  ): Prisma.RowWhereInput {
    return Object.fromEntries(
      Object.entries(where)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => this.processWhereEntry(key, value, schema)),
    ) as Prisma.RowWhereInput;
  }

  private processWhereEntry(
    key: string,
    value: unknown,
    schema: JsonSchema,
  ): [string, unknown] {
    if (key === 'AND' || key === 'OR') {
      return [key, this.processWhereArray(value, schema)];
    }

    if (key === 'NOT') {
      return [
        key,
        Array.isArray(value)
          ? this.processWhereArray(value, schema)
          : this.processWhereConditions(value as Prisma.RowWhereInput, schema),
      ];
    }

    if (key === 'data' && hasPath(value)) {
      const mapped = this.mapJsonFilterToSystemColumn(
        value as JsonFilter,
        schema,
      );
      return mapped ? [mapped.systemColumn, mapped.filter] : [key, value];
    }

    return [key, value];
  }

  private processWhereArray(
    value: unknown,
    schema: JsonSchema,
  ): Prisma.RowWhereInput[] {
    return (value as Prisma.RowWhereInput[]).map((v) =>
      this.processWhereConditions(v, schema),
    );
  }

  private processOrderByCondition(
    condition: OrderByConditions,
    schema: JsonSchema,
  ): OrderByConditions {
    return Object.fromEntries(
      Object.entries(condition).map(([key, value]) =>
        this.processOrderByEntry(key, value, schema),
      ),
    ) as OrderByConditions;
  }

  private processOrderByEntry(
    key: string,
    value: unknown,
    schema: JsonSchema,
  ): [string, unknown] {
    if (key === 'data' && hasPath(value)) {
      const mapped = this.mapJsonOrderByToSystemColumn(
        value as JsonOrderByInput,
        schema,
      );
      return mapped ? [mapped.systemColumn, mapped.direction] : [key, value];
    }

    return [key, value];
  }

  private mapJsonFilterToSystemColumn(
    filter: JsonFilter,
    schema: JsonSchema,
  ): { systemColumn: string; filter: unknown } | null {
    const fieldName = this.getFirstPathSegment(filter.path);
    if (!fieldName) {
      return null;
    }

    const systemColumn = this.getSystemColumnForField(fieldName, schema);
    if (!systemColumn) {
      return null;
    }

    return {
      systemColumn,
      filter: this.convertJsonFilterToColumnFilter(filter),
    };
  }

  private mapJsonOrderByToSystemColumn(
    orderBy: JsonOrderByInput,
    schema: JsonSchema,
  ): { systemColumn: string; direction: 'asc' | 'desc' } | null {
    const fieldName = this.getFirstPathSegment(orderBy.path);
    if (!fieldName) {
      return null;
    }

    const systemColumn = this.getSystemColumnForField(fieldName, schema);
    if (!systemColumn) {
      return null;
    }

    return {
      systemColumn,
      direction: orderBy.direction ?? 'asc',
    };
  }

  private getFirstPathSegment(path: string | string[]): string | null {
    if (Array.isArray(path)) {
      return path.length > 0 ? path[0] : null;
    }
    const segments = path.split('.');
    return segments.length > 0 ? segments[0] : null;
  }

  private getSystemColumnForField(
    fieldName: string,
    schema: JsonSchema,
  ): string | null {
    if (!isObjectSchema(schema)) {
      return null;
    }

    const fieldSchema = schema.properties?.[fieldName];
    if (!fieldSchema) {
      return null;
    }

    if (!isRefSchema(fieldSchema)) {
      return null;
    }

    return SYSTEM_SCHEMA_TO_COLUMN[fieldSchema.$ref] ?? null;
  }

  private convertJsonFilterToColumnFilter(filter: JsonFilter): unknown {
    const { path: _path, ...rest } = filter;

    return Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [
        JSON_FILTER_KEY_MAP[key] ?? key,
        value,
      ]),
    );
  }
}
