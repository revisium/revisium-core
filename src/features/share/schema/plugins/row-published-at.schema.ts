import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from 'src/features/share/utils/schema/types/schema.types';

export const rowPublishedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
};

export const ajvRowPublishedAtSchema: Schema = {
  $id: SystemSchemaIds.RowPublishedAt,
  ...rowPublishedAtSchema,
};
