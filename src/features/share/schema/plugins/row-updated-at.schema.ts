import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from '@revisium/schema-toolkit/types';

export const rowUpdatedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowUpdatedAtSchema: Schema = {
  $id: SystemSchemaIds.RowUpdatedAt,
  ...rowUpdatedAtSchema,
};
