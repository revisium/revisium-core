import { JsonPatchOp, MigrationType } from './enums';

export interface JsonPatchOperation {
  op: JsonPatchOp;
  path: string;
  value?: unknown;
  from?: string;
}

export interface HistoryPatch {
  hash: string;
  patches: JsonPatchOperation[];
}

export interface SchemaMigrationDetail {
  migrationType: MigrationType;
  migrationId: string;

  initialSchema?: unknown;

  patches?: JsonPatchOperation[];

  oldTableId?: string;
  newTableId?: string;

  historyPatches?: HistoryPatch[];
}

export enum SchemaFieldChangeType {
  Added = 'ADDED',
  Removed = 'REMOVED',
  Modified = 'MODIFIED',
  Moved = 'MOVED',
}

export interface SchemaFieldChange {
  fieldPath: string;
  changeType: SchemaFieldChangeType;
  oldSchema?: unknown;
  newSchema?: unknown;
  movedFrom?: string;
  movedTo?: string;
}

export interface SchemaChangeImpact {
  schemaHashChanged: boolean;
  migrationApplied: boolean;
  migrationDetails?: SchemaMigrationDetail;
  fieldSchemaChanges: SchemaFieldChange[];
}
