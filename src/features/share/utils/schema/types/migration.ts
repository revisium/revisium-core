import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export type UpdateMigration = {
  changeType: 'update';
  tableId: string;
  hash: string;
  id: string;
  patches: JsonPatch[];
};

export type RenameMigration = {
  changeType: 'rename';
  id: string;
  tableId: string;
};

export type InitMigration = {
  changeType: 'init';
  tableId: string;
  hash: string;
  id: string;
  schema: JsonSchema;
};

export type Migration = InitMigration | UpdateMigration | RenameMigration;

export type TableMigrations = {
  createdId: string;
  initMigration: InitMigration;
  migrations: Migration[];
};
