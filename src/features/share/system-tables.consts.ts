import { Schema } from 'ajv/dist/2020';
import { metaSchema } from 'src/features/share/schema/meta-schema';

export enum SystemTables {
  Schema = 'revisium_schema_table',
  SharedSchemas = 'revisium_shared_schemas_table',
}

export const findSchemaForSystemTables = (
  tableId: string,
): Schema | undefined => {
  if (tableId === SystemTables.Schema) {
    return metaSchema;
  }
};
