import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const traverseStore = (
  store: JsonSchemaStore,
  callback: (node: JsonSchemaStore) => void,
) => {
  callback(store);

  if (store.type === JsonSchemaTypeName.Object) {
    Object.values(store.properties).forEach((item) => {
      traverseStore(item, callback);
    });
  } else if (store.type === JsonSchemaTypeName.Array) {
    traverseStore(store.items, callback);
  }
};
