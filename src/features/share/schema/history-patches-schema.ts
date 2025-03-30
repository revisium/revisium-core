import { Schema } from 'ajv/dist/2020';
import { SystemSchemas } from 'src/features/share/schema/consts';

export const historyPatchesSchema: Schema = {
  $id: 'history-patches-schema.json',
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    properties: {
      patches: {
        $ref: SystemSchemas.JsonPatchSchema,
      },
      hash: {
        type: 'string',
      },
    },
    required: ['patches', 'hash'],
  },
};
