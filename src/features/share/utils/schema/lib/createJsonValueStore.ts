import { JsonArrayStore } from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonObjectStore } from 'src/features/share/utils/schema/model/schema/json-object.store';
import {
  JsonSchemaStore,
  JsonSchemaStorePrimitives,
} from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonArrayValueStore } from 'src/features/share/utils/schema/model/value/json-array-value.store';
import { JsonBooleanValueStore } from 'src/features/share/utils/schema/model/value/json-boolean-value.store';
import { JsonNumberValueStore } from 'src/features/share/utils/schema/model/value/json-number-value.store';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import {
  JsonValueStore,
  JsonValueStorePrimitives,
} from 'src/features/share/utils/schema/model/value/json-value.store';
import {
  JsonArray,
  JsonObject,
  JsonPrimitives,
  JsonValue,
} from 'src/features/share/utils/schema/types/json.types';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const createJsonValueStore = (
  schema: JsonSchemaStore,
  rowId: string,
  rawValue: JsonValue,
): JsonValueStore => {
  if (schema.type === JsonSchemaTypeName.Object) {
    return createJsonObjectValueStore(schema, rowId, rawValue as JsonObject);
  } else if (schema.type === JsonSchemaTypeName.Array) {
    return createJsonArrayValueStore(schema, rowId, rawValue as JsonArray);
  } else {
    return createPrimitiveValueStore(schema, rowId, rawValue as JsonPrimitives);
  }
};

export const createJsonObjectValueStore = (
  schema: JsonObjectStore,
  rowId: string,
  rawValue: JsonObject,
): JsonObjectValueStore => {
  const value = createJsonObjectRecord(schema, rowId, rawValue);
  return new JsonObjectValueStore(schema, rowId, value);
};

export const createJsonObjectRecord = (
  schema: JsonObjectStore,
  rowId: string,
  rawValue: JsonObject,
) => {
  return Object.entries(rawValue).reduce<Record<string, JsonValueStore>>(
    (reduceValue, [key, itemValue]) => {
      const itemSchema = schema.getProperty(key);

      if (itemSchema === undefined || itemValue === undefined) {
        throw new Error('Invalid item');
      }

      reduceValue[key] = createJsonValueStore(itemSchema, rowId, itemValue);

      return reduceValue;
    },
    {},
  );
};

export const createJsonArrayValueStore = (
  schema: JsonArrayStore,
  rowId: string,
  rawValue: JsonArray,
): JsonArrayValueStore => {
  const value = createJsonArrayValueItems(schema, rowId, rawValue);
  return new JsonArrayValueStore(schema, rowId, value);
};

export const createJsonArrayValueItems = (
  schema: JsonArrayStore,
  rowId: string,
  rawValue: JsonArray,
): JsonValueStore[] => {
  return rawValue.map((value) =>
    createJsonValueStore(schema.items, rowId, value),
  );
};

export const createPrimitiveValueStore = (
  schema: JsonSchemaStorePrimitives,
  rowId: string,
  rawValue: JsonPrimitives,
): JsonValueStorePrimitives => {
  if (schema.type === JsonSchemaTypeName.String) {
    return new JsonStringValueStore(schema, rowId, rawValue as string | null);
  } else if (schema.type === JsonSchemaTypeName.Number) {
    return new JsonNumberValueStore(schema, rowId, rawValue as number | null);
  } else if (schema.type === JsonSchemaTypeName.Boolean) {
    return new JsonBooleanValueStore(schema, rowId, rawValue as boolean | null);
  } else {
    throw new Error('this type is not allowed');
  }
};
