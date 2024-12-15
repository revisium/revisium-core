import { Schema } from 'ajv/dist/2020';

// copied and modified from https://json.schemastore.org/json-patch

export const jsonPatchSchema: Schema = {
  definitions: {
    path: {
      description: 'A JSON Pointer path.',
      type: 'string',
    },
  },
  $id: 'https://json.schemastore.org/json-patch.json',
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
