import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from '@revisium/schema-toolkit/types';

export const rowVersionIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowVersionIdSchema: Schema = {
  $id: SystemSchemaIds.RowVersionId,
  ...rowVersionIdSchema,
};
