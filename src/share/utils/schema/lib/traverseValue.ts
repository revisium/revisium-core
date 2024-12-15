import { JsonValueStore } from 'src/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/share/utils/schema/types/schema.types';

export const traverseValue = (
  store: JsonValueStore,
  callback: (node: JsonValueStore) => void,
) => {
  callback(store);

  if (store.type === JsonSchemaTypeName.Object) {
    Object.values(store.value).forEach((item) => {
      traverseValue(item, callback);
    });
  } else if (store.type === JsonSchemaTypeName.Array) {
    store.value.forEach((itemValue) => {
      traverseValue(itemValue, callback);
    });
  }
};
