import { JsonArrayStore } from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonBooleanStore } from 'src/features/share/utils/schema/model/schema/json-boolean.store';
import { JsonNumberStore } from 'src/features/share/utils/schema/model/schema/json-number.store';
import { JsonObjectStore } from 'src/features/share/utils/schema/model/schema/json-object.store';
import {
  JsonSchemaStore,
  JsonSchemaStorePrimitives,
} from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';
import {
  JsonObjectSchema,
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

export const createJsonSchemaStore = (schema: JsonSchema): JsonSchemaStore => {
  if (schema.type === JsonSchemaTypeName.Object) {
    return createJsonObjectSchemaStore(schema);
  } else if (schema.type === JsonSchemaTypeName.Array) {
    return new JsonArrayStore(createJsonSchemaStore(schema.items));
  } else {
    return createPrimitiveStoreBySchema(schema);
  }
};

export const createJsonObjectSchemaStore = (
  value: JsonObjectSchema,
): JsonObjectStore => {
  const store = new JsonObjectStore();

  for (const requiredField of value.required) {
    if (!value.properties[requiredField]) {
      throw new Error(
        `Not found required field "${requiredField}" in "properties"`,
      );
    }
  }

  Object.entries(value.properties).forEach(([name, item]) => {
    store.addPropertyWithStore(name, createJsonSchemaStore(item));
  });

  return store;
};

export const createPrimitiveStoreBySchema = (
  schema: JsonSchema,
): JsonSchemaStorePrimitives => {
  if (schema.type === JsonSchemaTypeName.String) {
    const stringStore = new JsonStringStore();
    stringStore.reference = schema.reference;
    return stringStore;
  } else if (schema.type === JsonSchemaTypeName.Number) {
    return new JsonNumberStore();
  } else if (schema.type === JsonSchemaTypeName.Boolean) {
    return new JsonBooleanStore();
  } else {
    throw new Error('this type is not allowed');
  }
};
