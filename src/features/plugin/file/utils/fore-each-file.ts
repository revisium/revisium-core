import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { FileValueStore } from '../file-value.store';

export const forEachFile = (
  valueStore: JsonValueStore,
  callback: (store: FileValueStore) => void,
) => {
  traverseValue(valueStore, (item) => {
    if (
      item.schema.$ref === SystemSchemaIds.File &&
      item.type === JsonSchemaTypeName.Object
    ) {
      callback(new FileValueStore(item));
    }
  });
};
