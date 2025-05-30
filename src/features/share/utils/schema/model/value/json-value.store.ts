import { JsonArrayValueStore } from 'src/features/share/utils/schema/model/value/json-array-value.store';
import { JsonBooleanValueStore } from 'src/features/share/utils/schema/model/value/json-boolean-value.store';
import { JsonNumberValueStore } from 'src/features/share/utils/schema/model/value/json-number-value.store';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';

export type JsonValueStorePrimitives =
  | JsonStringValueStore
  | JsonNumberValueStore
  | JsonBooleanValueStore;

export type JsonValueStoreParent = JsonObjectValueStore | JsonArrayValueStore;

export type JsonValueStore = JsonValueStoreParent | JsonValueStorePrimitives;
