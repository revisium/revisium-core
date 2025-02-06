import { Schema } from 'ajv/dist/2020';

export const historyPatchesSchema: Schema = {
  $id: 'history-patches-schema.json',
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    properties: {
      patches: {
        $ref: 'json-patch-schema.json',
      },
      hash: {
        type: 'string',
      },
    },
    required: ['patches', 'hash'],
  },
};
