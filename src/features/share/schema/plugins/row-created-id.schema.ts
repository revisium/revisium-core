import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from 'src/features/share/utils/schema/types/schema.types';

export const rowCreatedIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowCreatedIdSchema: Schema = {
  $id: SystemSchemaIds.RowCreatedId,
  ...rowCreatedIdSchema,
};
