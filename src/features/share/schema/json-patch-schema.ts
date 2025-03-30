import { Schema } from 'ajv/dist/2020';
import { SystemSchemas } from 'src/features/share/schema/consts';
import {
  arrayMetaSchema,
  booleanMetaSchema,
  numberMetaSchema,
  objectMetaSchema,
  stringMetaSchema,
} from 'src/features/share/schema/meta-schema';

// copied and modified from https://json.schemastore.org/json-patch

export const jsonPatchSchema: Schema = {
  $id: SystemSchemas.JsonPatchSchema,
  definitions: {
    path: {
      description: 'A JSON Pointer path.',
      type: 'string',
    },
    objectSchema: objectMetaSchema,
    stringSchema: stringMetaSchema,
    numberSchema: numberMetaSchema,
    booleanSchema: booleanMetaSchema,
    arraySchema: arrayMetaSchema,
  },
  minItems: 1,
  items: {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'op', 'path'],
        properties: {
          path: {
            $ref: '#/definitions/path',
          },
          op: {
            description: 'The operation to perform.',
            type: 'string',
            enum: ['add', 'replace'],
          },
          value: {
            $ref: SystemSchemas.MetaSchema,
            description: 'The value to add, replace or test.',
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['op', 'path'],
        properties: {
          path: {
            $ref: '#/definitions/path',
          },
          op: {
            description: 'The operation to perform.',
            type: 'string',
            enum: ['remove'],
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'op', 'path'],
        properties: {
          path: {
            $ref: '#/definitions/path',
          },
          op: {
            description: 'The operation to perform.',
            type: 'string',
            enum: ['move', 'copy'],
          },
          from: {
            $ref: '#/definitions/path',
            description:
              'A JSON Pointer path pointing to the location to move/copy from.',
          },
        },
      },
    ],
  },
  title: 'JSON schema for JSONPatch files',
  type: 'array',
};
