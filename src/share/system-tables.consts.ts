import { Schema } from 'ajv/dist/2020';
import { metaSchema } from 'src/share/schema/meta-schema';

export enum SystemTables {
  Schema = 'schema',
}

export const findSchemaForSystemTables = (
  tableId: string,
): Schema | undefined => {
  if (tableId === SystemTables.Schema) {
    return metaSchema;
  }
};
