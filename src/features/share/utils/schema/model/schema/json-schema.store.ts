import { JsonArrayStore } from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonBooleanStore } from 'src/features/share/utils/schema/model/schema/json-boolean.store';
import { JsonNumberStore } from 'src/features/share/utils/schema/model/schema/json-number.store';
import { JsonObjectStore } from 'src/features/share/utils/schema/model/schema/json-object.store';
import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';

export type JsonSchemaStorePrimitives =
  | JsonStringStore
  | JsonNumberStore
  | JsonBooleanStore;

export type JsonSchemaStore =
  | JsonObjectStore
  | JsonArrayStore
  | JsonSchemaStorePrimitives;
