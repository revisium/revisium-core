import { Injectable } from '@nestjs/common';
import { FieldChange, RowChangeDetailType } from '../types';
import * as jsonpatch from 'fast-json-patch';

@Injectable()
export class RowDiffService {
  public analyzeFieldChanges(
    fromData: Record<string, unknown> | null,
    toData: Record<string, unknown> | null,
    fromSchemaHash?: string,
    toSchemaHash?: string,
  ): FieldChange[] {
    if (!fromData && !toData) {
      return [];
    }

    if (!fromData && toData) {
      return this.getAllFieldsAsAdded(toData);
    }

    if (fromData && !toData) {
      return this.getAllFieldsAsRemoved(fromData);
    }

    const schemaChanged = Boolean(
      fromSchemaHash && toSchemaHash && fromSchemaHash !== toSchemaHash,
    );

    return this.computeFieldDiff(fromData!, toData!, schemaChanged);
  }

  private getAllFieldsAsAdded(data: Record<string, unknown>): FieldChange[] {
    return this.flattenObject(data).map(({ path, value }) => ({
      fieldPath: path,
      oldValue: null,
      newValue: value,
      changeType: RowChangeDetailType.FieldAdded,
    }));
  }

  private getAllFieldsAsRemoved(data: Record<string, unknown>): FieldChange[] {
    return this.flattenObject(data).map(({ path, value }) => ({
      fieldPath: path,
      oldValue: value,
      newValue: null,
      changeType: RowChangeDetailType.FieldRemoved,
    }));
  }

  private computeFieldDiff(
    fromData: Record<string, unknown>,
    toData: Record<string, unknown>,
    schemaChanged: boolean,
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const diff = jsonpatch.compare(fromData, toData);

    for (const operation of diff) {
      const fieldPath = this.normalizeFieldPath(operation.path);

      if (operation.op === 'add') {
        changes.push({
          fieldPath,
          oldValue: null,
          newValue: (operation as any).value,
          changeType: schemaChanged
            ? RowChangeDetailType.SchemaMigration
            : RowChangeDetailType.FieldAdded,
        });
      } else if (operation.op === 'remove') {
        changes.push({
          fieldPath,
          oldValue: this.getValueAtPath(fromData, fieldPath),
          newValue: null,
          changeType: schemaChanged
            ? RowChangeDetailType.SchemaMigration
            : RowChangeDetailType.FieldRemoved,
        });
      } else if (operation.op === 'replace') {
        changes.push({
          fieldPath,
          oldValue: this.getValueAtPath(fromData, fieldPath),
          newValue: (operation as any).value,
          changeType: RowChangeDetailType.FieldModified,
        });
      } else if (operation.op === 'move') {
        const fromPath = this.normalizeFieldPath((operation as any).from);
        changes.push({
          fieldPath,
          oldValue: this.getValueAtPath(fromData, fromPath),
          newValue: this.getValueAtPath(toData, fieldPath),
          changeType: RowChangeDetailType.FieldMoved,
          movedFrom: fromPath,
        });
      }
    }

    return changes;
  }

  private normalizeFieldPath(jsonPointerPath: string): string {
    return jsonPointerPath.slice(1).replace(/\//g, '.');
  }

  private flattenObject(
    obj: Record<string, unknown>,
    prefix = '',
  ): Array<{ path: string; value: unknown }> {
    const result: Array<{ path: string; value: unknown }> = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result.push(
          ...this.flattenObject(value as Record<string, unknown>, path),
        );
      } else {
        result.push({ path, value });
      }
    }

    return result;
  }

  private getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
