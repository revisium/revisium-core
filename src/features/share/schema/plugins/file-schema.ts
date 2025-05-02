import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import {
  JsonObjectSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

export const fileSchema: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  properties: {
    status: { type: JsonSchemaTypeName.String, default: '', readOnly: true },
    fileId: { type: JsonSchemaTypeName.String, default: '', readOnly: true },
    fromRowVersionId: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    url: { type: JsonSchemaTypeName.String, default: '', readOnly: true },
    fileName: { type: JsonSchemaTypeName.String, default: '' },
    hash: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    extension: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    mimeType: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    size: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
    },
    width: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
    },
    height: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
    },
  },
  required: [
    'status',
    'fileId',
    'fromRowVersionId',
    'url',
    'fileName',
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
