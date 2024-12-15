import { JsonArrayStore } from 'src/share/utils/schema/model/schema/json-array.store';
import { JsonBooleanStore } from 'src/share/utils/schema/model/schema/json-boolean.store';
import { JsonNumberStore } from 'src/share/utils/schema/model/schema/json-number.store';
import { JsonObjectStore } from 'src/share/utils/schema/model/schema/json-object.store';
import { JsonStringStore } from 'src/share/utils/schema/model/schema/json-string.store';

export type JsonSchemaStorePrimitives =
  | JsonStringStore
  | JsonNumberStore
  | JsonBooleanStore;

export type JsonSchemaStore =
  | JsonObjectStore
  | JsonArrayStore
  | JsonSchemaStorePrimitives;
