import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import {
  JsonObjectSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

export const fileSchema: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  properties: {
    status: { type: JsonSchemaTypeName.String, default: '' },
    url: { type: JsonSchemaTypeName.String, default: '' },
    filename: { type: JsonSchemaTypeName.String, default: '' },
    hash: {
      type: JsonSchemaTypeName.String,
      default: '',
    },
    extension: {
      type: JsonSchemaTypeName.String,
      default: '',
    },
    mimeType: {
      type: JsonSchemaTypeName.String,
      default: '',
    },
    size: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
    width: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
    height: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
  },
  required: [
    'status',
    'url',
    'filename',
    'hash',
    'extension',
    'mimeType',
    'size',
    'width',
    'height',
  ],
  additionalProperties: false,
};

export const ajvFileSchema: Schema = {
  $id: SystemSchemaIds.File,
  ...fileSchema,
};
