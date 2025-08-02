import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export type UpdateMigration = {
  changeType: 'update';
  tableId: string;
  hash: string;
  date: string;
  patches: JsonPatch[];
};

export type RenameMigration = {
  changeType: 'rename';
  date: string;
  tableId: string;
};

export type Migration = UpdateMigration | RenameMigration;

export type InitMigration = {
  changeType: 'init';
  tableId: string;
  hash: string;
  date: string;
  schema: JsonSchema;
};

export type TableMigrations = {
  createdId: string;
  initMigration: InitMigration;
  migrations: Migration[];
};
