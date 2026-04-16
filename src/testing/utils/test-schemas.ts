import {
  getNumberSchema,
  getObjectSchema,
} from '@revisium/schema-toolkit/mocks';
import {
  JsonSchemaTypeName,
  JsonObjectSchema,
} from '@revisium/schema-toolkit/types';

export const testSchema: JsonObjectSchema = getObjectSchema({
  ver: getNumberSchema(),
});

export const getTestLinkedSchema = (tableId: string): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  required: ['link'],
  properties: {
    link: {
      type: JsonSchemaTypeName.String,
      default: '',
      foreignKey: tableId,
    },
  },
  additionalProperties: false,
});
