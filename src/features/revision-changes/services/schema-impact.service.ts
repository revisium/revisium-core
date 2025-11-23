import { Injectable } from '@nestjs/common';
import {
  SchemaChangeImpact,
  SchemaMigrationDetail,
  JsonPatchOperation,
  FieldMove,
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
    const affectedFields = this.extractAffectedFields(migrationDetails);

    return {
      schemaHashChanged: true,
      affectedFields,
      migrationApplied: migrations.length > 0,
      migrationDetails:
        migrationDetails.length > 0 ? migrationDetails[0] : undefined,
      addedFields: this.extractAddedFields(migrationDetails),
      removedFields: this.extractRemovedFields(migrationDetails),
      modifiedFields: this.extractModifiedFields(migrationDetails),
      movedFields: this.extractMovedFields(migrationDetails),
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

  private extractAffectedFields(migrations: SchemaMigrationDetail[]): string[] {
    const fields = new Set<string>();

    for (const migration of migrations) {
      if (migration.patches) {
        for (const patch of migration.patches) {
          const fieldPath = this.extractFieldPath(patch.path);
          if (fieldPath) {
            fields.add(fieldPath);
          }
        }
      }
    }

    return Array.from(fields);
  }

  private extractAddedFields(migrations: SchemaMigrationDetail[]): string[] {
    const fields = new Set<string>();

    for (const migration of migrations) {
      if (migration.patches) {
        for (const patch of migration.patches) {
          if (patch.op === JsonPatchOp.Add) {
            const fieldPath = this.extractFieldPath(patch.path);
            if (fieldPath) {
              fields.add(fieldPath);
            }
          }
        }
      }
    }

    return Array.from(fields);
  }

  private extractRemovedFields(migrations: SchemaMigrationDetail[]): string[] {
    const fields = new Set<string>();

    for (const migration of migrations) {
      if (migration.patches) {
        for (const patch of migration.patches) {
          if (patch.op === JsonPatchOp.Remove) {
            const fieldPath = this.extractFieldPath(patch.path);
            if (fieldPath) {
              fields.add(fieldPath);
            }
          }
        }
      }
    }

    return Array.from(fields);
  }

  private extractModifiedFields(migrations: SchemaMigrationDetail[]): string[] {
    const fields = new Set<string>();

    for (const migration of migrations) {
      if (migration.patches) {
        for (const patch of migration.patches) {
          if (patch.op === JsonPatchOp.Replace) {
            const fieldPath = this.extractFieldPath(patch.path);
            if (fieldPath) {
              fields.add(fieldPath);
            }
          }
        }
      }
    }

    return Array.from(fields);
  }

  private extractMovedFields(migrations: SchemaMigrationDetail[]): FieldMove[] {
    const moves: FieldMove[] = [];

    for (const migration of migrations) {
      if (migration.patches) {
        for (const patch of migration.patches) {
          if (patch.op === JsonPatchOp.Move && patch.from) {
            const fromPath = this.extractFieldPath(patch.from);
            const toPath = this.extractFieldPath(patch.path);
            if (fromPath && toPath) {
              moves.push({ from: fromPath, to: toPath });
            }
          }
        }
      }
    }

    return moves;
  }

  private extractFieldPath(jsonPath: string): string | null {
    const match = jsonPath.match(/\/properties\/([^/]+)/);
    return match ? match[1] : null;
  }
}
