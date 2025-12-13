import { Injectable } from '@nestjs/common';
import {
  JsonObjectSchema,
  JsonPatch,
  JsonSchema,
  JsonSchemaTypeName,
  JsonSchemaWithoutRef,
} from '@revisium/schema-toolkit/types';
import {
  TableViewsData,
  View,
  ViewColumn,
  ViewFilterGroup,
  ViewSort,
} from 'src/features/views/types';

function isRefSchema(schema: JsonSchema): schema is { $ref: string } {
  return '$ref' in schema;
}

function isObjectSchema(
  schema: JsonSchemaWithoutRef,
): schema is JsonObjectSchema {
  return schema.type === JsonSchemaTypeName.Object;
}

export interface MigrateViewsOptions {
  viewsData: TableViewsData;
  patches: JsonPatch[];
  previousSchema: JsonSchema;
}

export interface MigrateViewsContext {
  revisionId: string;
  tableId: string;
}

interface MigrationState {
  viewsData: TableViewsData;
  fieldRenames: Map<string, string>; // newPath -> originalPath
}

export class ViewsMigrationError extends Error {
  constructor(
    message: string,
    public readonly context: MigrateViewsContext,
    public readonly details: {
      viewId?: string;
      patchOp?: string;
      patchPath?: string;
      originalError?: Error;
    },
  ) {
    super(message);
    this.name = 'ViewsMigrationError';
  }
}

@Injectable()
export class ViewsMigrationService {
  public migrateViews(
    options: MigrateViewsOptions,
    context?: MigrateViewsContext,
  ): TableViewsData {
    const { viewsData, patches } = options;

    let state: MigrationState = {
      viewsData: this.cloneViewsData(viewsData),
      fieldRenames: new Map(),
    };

    for (const patch of patches) {
      try {
        state = this.applyPatch(state, patch, options.previousSchema);
      } catch (error) {
        if (context) {
          throw new ViewsMigrationError(
            `Failed to apply patch "${patch.op}" at path "${patch.path}" for table "${context.tableId}"`,
            context,
            {
              patchOp: patch.op,
              patchPath: patch.path,
              originalError: error instanceof Error ? error : undefined,
            },
          );
        }
        throw error;
      }
    }

    return state.viewsData;
  }

  private applyPatch(
    state: MigrationState,
    patch: JsonPatch,
    previousSchema: JsonSchema,
  ): MigrationState {
    switch (patch.op) {
      case 'move':
        return this.applyMovePatch(state, patch.from, patch.path);
      case 'remove':
        return {
          ...state,
          viewsData: this.applyRemovePatch(state.viewsData, patch.path),
        };
      case 'replace':
        return {
          ...state,
          viewsData: this.applyReplacePatch(
            state.viewsData,
            patch.path,
            patch.value,
            previousSchema,
            state.fieldRenames,
          ),
        };
      case 'add':
        return state;
      default:
        return state;
    }
  }

  private applyMovePatch(
    state: MigrationState,
    from: string,
    to: string,
  ): MigrationState {
    const oldFieldPath = this.patchPathToFieldPath(from);
    const newFieldPath = this.patchPathToFieldPath(to);

    const cleanFrom = this.normalizePatchPath(from);
    const cleanTo = this.normalizePatchPath(to);

    const newFieldRenames = new Map(state.fieldRenames);
    const originalPath = state.fieldRenames.get(cleanFrom) ?? cleanFrom;
    newFieldRenames.delete(cleanFrom);
    newFieldRenames.set(cleanTo, originalPath);

    return {
      viewsData: {
        ...state.viewsData,
        views: state.viewsData.views.map((view) =>
          this.renameFieldInView(view, oldFieldPath, newFieldPath),
        ),
      },
      fieldRenames: newFieldRenames,
    };
  }

  private applyRemovePatch(
    viewsData: TableViewsData,
    path: string,
  ): TableViewsData {
    const fieldPath = this.patchPathToFieldPath(path);

    return {
      ...viewsData,
      views: viewsData.views.map((view) =>
        this.removeFieldFromView(view, fieldPath),
      ),
    };
  }

  private applyReplacePatch(
    viewsData: TableViewsData,
    path: string,
    newSchema: JsonSchema,
    previousSchema: JsonSchema,
    fieldRenames: Map<string, string>,
  ): TableViewsData {
    const fieldPath = this.patchPathToFieldPath(path);
    const fieldName = this.normalizePatchPath(path);
    const originalFieldName = fieldRenames.get(fieldName) ?? fieldName;
    const previousType = this.getFieldType(previousSchema, originalFieldName);
    const newType = this.getSchemaType(newSchema);

    if (previousType && newType && previousType !== newType) {
      return {
        ...viewsData,
        views: viewsData.views.map((view) =>
          this.removeFiltersForField(view, fieldPath),
        ),
      };
    }

    return viewsData;
  }

  private normalizePatchPath(path: string): string {
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (cleanPath.startsWith('properties/')) {
      cleanPath = cleanPath.slice('properties/'.length);
    }
    return cleanPath;
  }

  private patchPathToFieldPath(patchPath: string): string {
    const cleanPath = this.normalizePatchPath(patchPath);
    return `data.${cleanPath}`;
  }

  private renameFieldInView(
    view: View,
    oldFieldPath: string,
    newFieldPath: string,
  ): View {
    return {
      ...view,
      columns: view.columns
        ? this.renameFieldInColumns(view.columns, oldFieldPath, newFieldPath)
        : view.columns,
      sorts: view.sorts
        ? this.renameFieldInSorts(view.sorts, oldFieldPath, newFieldPath)
        : view.sorts,
      filters: view.filters
        ? this.renameFieldInFilterGroup(
            view.filters,
            oldFieldPath,
            newFieldPath,
          )
        : view.filters,
    };
  }

  private removeFieldFromView(view: View, fieldPath: string): View {
    return {
      ...view,
      columns: view.columns
        ? this.removeFieldFromColumns(view.columns, fieldPath)
        : view.columns,
      sorts: view.sorts
        ? this.removeFieldFromSorts(view.sorts, fieldPath)
        : view.sorts,
      filters: view.filters
        ? this.removeFieldFromFilterGroup(view.filters, fieldPath)
        : view.filters,
    };
  }

  private removeFiltersForField(view: View, fieldPath: string): View {
    return {
      ...view,
      filters: view.filters
        ? this.removeFieldFromFilterGroup(view.filters, fieldPath)
        : view.filters,
    };
  }

  private renameFieldInColumns(
    columns: ViewColumn[],
    oldFieldPath: string,
    newFieldPath: string,
  ): ViewColumn[] {
    return columns.map((column) => ({
      ...column,
      field: column.field === oldFieldPath ? newFieldPath : column.field,
    }));
  }

  private renameFieldInSorts(
    sorts: ViewSort[],
    oldFieldPath: string,
    newFieldPath: string,
  ): ViewSort[] {
    return sorts.map((sort) => ({
      ...sort,
      field: sort.field === oldFieldPath ? newFieldPath : sort.field,
    }));
  }

  private renameFieldInFilterGroup(
    filterGroup: ViewFilterGroup,
    oldFieldPath: string,
    newFieldPath: string,
  ): ViewFilterGroup {
    return {
      ...filterGroup,
      conditions: filterGroup.conditions?.map((condition) => ({
        ...condition,
        field:
          condition.field === oldFieldPath ? newFieldPath : condition.field,
      })),
      groups: filterGroup.groups?.map((group) =>
        this.renameFieldInFilterGroup(group, oldFieldPath, newFieldPath),
      ),
    };
  }

  private removeFieldFromColumns(
    columns: ViewColumn[],
    fieldPath: string,
  ): ViewColumn[] {
    return columns.filter((column) => column.field !== fieldPath);
  }

  private removeFieldFromSorts(
    sorts: ViewSort[],
    fieldPath: string,
  ): ViewSort[] {
    return sorts.filter((sort) => sort.field !== fieldPath);
  }

  private removeFieldFromFilterGroup(
    filterGroup: ViewFilterGroup,
    fieldPath: string,
  ): ViewFilterGroup {
    const result: ViewFilterGroup = {
      ...filterGroup,
      conditions: filterGroup.conditions?.filter(
        (condition) => condition.field !== fieldPath,
      ),
      groups: filterGroup.groups
        ?.map((group) => this.removeFieldFromFilterGroup(group, fieldPath))
        .filter(
          (group) =>
            (group.conditions && group.conditions.length > 0) ||
            (group.groups && group.groups.length > 0),
        ),
    };

    return result;
  }

  private getFieldType(
    schema: JsonSchema,
    fieldName: string,
  ): JsonSchemaTypeName | null {
    if (isRefSchema(schema)) {
      return null;
    }

    if (!isObjectSchema(schema)) {
      return null;
    }

    const fieldSchema = schema.properties[fieldName];

    if (!fieldSchema) {
      return null;
    }

    return this.getSchemaType(fieldSchema);
  }

  private getSchemaType(schema: JsonSchema): JsonSchemaTypeName | null {
    if (isRefSchema(schema)) {
      return null;
    }
    return schema.type;
  }

  private cloneViewsData(viewsData: TableViewsData): TableViewsData {
    return JSON.parse(JSON.stringify(viewsData));
  }
}
