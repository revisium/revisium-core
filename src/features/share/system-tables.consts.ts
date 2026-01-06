import { Schema } from 'ajv/dist/2020';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { tableViewsSchema } from 'src/features/share/schema/table-views-schema';

export const SYSTEM_TABLE_PREFIX = 'revisium_';

export enum SystemTables {
  Schema = `${SYSTEM_TABLE_PREFIX}schema_table`,
  Migration = `${SYSTEM_TABLE_PREFIX}migration_table`,
  SharedSchemas = `${SYSTEM_TABLE_PREFIX}shared_schemas_table`,
  Views = `${SYSTEM_TABLE_PREFIX}views_table`,
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
