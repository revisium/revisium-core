import { JsonPatchOp, MigrationType } from './enums';
import { FieldMove } from './field-change.types';

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

export interface SchemaChangeImpact {
  schemaHashChanged: boolean;
  affectedFields: string[];
  migrationApplied: boolean;
  migrationDetails?: SchemaMigrationDetail;

  addedFields: string[];
  removedFields: string[];
  modifiedFields: string[];
  movedFields: FieldMove[];
}
