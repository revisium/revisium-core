import { Schema } from 'ajv/dist/2020';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';

export enum SystemTables {
  Schema = 'revisium_schema_table',
  Migration = 'revisium_migration_table',
  SharedSchemas = 'revisium_shared_schemas_table',
}

export const systemTablesIds: string[] = [
  SystemTables.Schema,
  SystemTables.SharedSchemas,
  SystemTables.Migration,
];

export const findSchemaForSystemTables = (
  tableId: string,
): Schema | undefined => {
  if (tableId === SystemTables.Schema) {
    return metaSchema;
  } else if (tableId === SystemTables.Migration) {
    return tableMigrationsSchema;
  }
};
