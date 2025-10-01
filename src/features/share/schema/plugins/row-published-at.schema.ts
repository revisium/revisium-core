import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from '@revisium/schema-toolkit/types';

export const rowPublishedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
};

export const ajvRowPublishedAtSchema: Schema = {
  $id: SystemSchemaIds.RowPublishedAt,
  ...rowPublishedAtSchema,
};
