import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { traverseValue } from '@revisium/schema-toolkit/lib';
import { JsonValueStore } from '@revisium/schema-toolkit/model';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
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
