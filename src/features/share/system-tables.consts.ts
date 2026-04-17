import { Schema } from 'ajv/dist/2020';
import {
  metaSchema,
  tableMigrationsSchema,
  tableViewsSchema,
} from '@revisium/engine';

export const SYSTEM_TABLE_PREFIX = 'revisium_';

export enum SystemTables {
  Schema = 'revisium_schema_table',
  Migration = 'revisium_migration_table',
  SharedSchemas = 'revisium_shared_schemas_table',
  Views = 'revisium_views_table',
}

export const systemTablesIds: string[] = [
  SystemTables.Schema,
  SystemTables.SharedSchemas,
  SystemTables.Migration,
  SystemTables.Views,
];

export const findSchemaForSystemTables = (
  tableId: string,
): Schema | undefined => {
  if (tableId === SystemTables.Schema) {
    return metaSchema;
  } else if (tableId === SystemTables.Migration) {
    return tableMigrationsSchema;
  } else if (tableId === SystemTables.Views) {
    return tableViewsSchema;
  }
};
