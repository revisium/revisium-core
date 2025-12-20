import { Injectable } from '@nestjs/common';
import {
  SchemaChangeImpact,
  SchemaMigrationDetail,
  JsonPatchOperation,
  SchemaFieldChange,
  SchemaFieldChangeType,
  MigrationType,
  JsonPatchOp,
} from '../types';
import { Prisma } from 'src/__generated__/client';
import { Migration } from '@revisium/schema-toolkit/types';

@Injectable()
export class SchemaImpactService {
  analyzeSchemaImpact(
    fromSchemaHash: string | null,
    toSchemaHash: string | null,
    migrations: Prisma.JsonValue[],
  ): SchemaChangeImpact | null {
    if (!fromSchemaHash || !toSchemaHash || fromSchemaHash === toSchemaHash) {
      return null;
    }

    const migrationDetails = this.extractMigrationDetails(migrations);

    return {
      schemaHashChanged: true,
      migrationApplied: migrations.length > 0,
      migrationDetails:
        migrationDetails.length > 0 ? migrationDetails[0] : undefined,
      fieldSchemaChanges: this.extractFieldSchemaChanges(migrationDetails),
    };
  }

  public extractMigrationDetails(
    migrations: Prisma.JsonValue[],
  ): SchemaMigrationDetail[] {
    return migrations.map((migration) => {
      const m = migration as Migration;

      const detail: SchemaMigrationDetail = {
        migrationType: this.mapMigrationType(m.changeType),
        migrationId: m.id,
      };

      if (m.changeType === 'init') {
        detail.initialSchema = m.schema;
      } else if (m.changeType === 'update') {
        detail.patches = this.convertPatches(m.patches);
      } else if (m.changeType === 'rename') {
        detail.oldTableId = m.tableId;
        detail.newTableId = m.nextTableId;
      }

      return detail;
    });
  }

  private mapMigrationType(changeType: string): MigrationType {
    switch (changeType) {
      case 'init':
        return MigrationType.Init;
      case 'update':
        return MigrationType.Update;
      case 'rename':
        return MigrationType.Rename;
      case 'remove':
        return MigrationType.Remove;
      default:
        return MigrationType.Update;
    }
  }

  private convertPatches(patches: any[]): JsonPatchOperation[] {
    return patches.map((patch) => ({
      op: this.mapPatchOp(patch.op),
      path: patch.path,
      value: patch.value,
      from: patch.from,
    }));
  }

  private mapPatchOp(op: string): JsonPatchOp {
    switch (op) {
      case 'add':
        return JsonPatchOp.Add;
      case 'remove':
        return JsonPatchOp.Remove;
      case 'replace':
        return JsonPatchOp.Replace;
      case 'move':
        return JsonPatchOp.Move;
      case 'copy':
        return JsonPatchOp.Copy;
      default:
        return JsonPatchOp.Replace;
    }
  }

  private extractFieldSchemaChanges(
    migrations: SchemaMigrationDetail[],
  ): SchemaFieldChange[] {
    return migrations
      .filter((m) => m.patches)
      .flatMap((m) =>
        m.patches!.map((p) => this.patchToFieldChange(p)).filter(Boolean),
      ) as SchemaFieldChange[];
  }

  private patchToFieldChange(
    patch: JsonPatchOperation,
  ): SchemaFieldChange | null {
    const fieldPath = this.extractFieldPath(patch.path);
    if (!fieldPath) {
      return null;
    }

    switch (patch.op) {
      case JsonPatchOp.Add:
        return {
          fieldPath,
          changeType: SchemaFieldChangeType.Added,
          newSchema: patch.value,
        };
      case JsonPatchOp.Remove:
        return { fieldPath, changeType: SchemaFieldChangeType.Removed };
      case JsonPatchOp.Replace:
        return {
          fieldPath,
          changeType: SchemaFieldChangeType.Modified,
          newSchema: patch.value,
        };
      case JsonPatchOp.Move:
        return this.createMoveChange(patch, fieldPath);
      default:
        return null;
    }
  }

  private createMoveChange(
    patch: JsonPatchOperation,
    fieldPath: string,
  ): SchemaFieldChange | null {
    if (!patch.from) {
      return null;
    }
    const fromPath = this.extractFieldPath(patch.from);
    if (!fromPath) {
      return null;
    }
    return {
      fieldPath,
      changeType: SchemaFieldChangeType.Moved,
      movedFrom: fromPath,
      movedTo: fieldPath,
    };
  }

  private extractFieldPath(jsonPath: string): string | null {
    const match = jsonPath.match(/\/properties\/([^/]+)/);
    return match ? match[1] : null;
  }
}
