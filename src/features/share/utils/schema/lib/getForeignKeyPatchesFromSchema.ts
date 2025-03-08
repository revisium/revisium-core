import { getPathByStore } from 'src/features/share/utils/schema/lib/getPathByStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import {
  JsonPatch,
  JsonPatchReplace,
} from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const getForeignKeyPatchesFromSchema = (
  store: JsonSchemaStore,
  options: { tableId: string; nextTableId: string },
) => {
  const stores: JsonPatch[] = [];

  traverseStore(store, (item) => {
    if (
      item.type === JsonSchemaTypeName.String &&
      item.foreignKey === options.tableId
    ) {
      item.foreignKey = options.nextTableId;

      const patch: JsonPatchReplace = {
        op: 'replace',
        path: getPathByStore(item),
        value: item.getPlainSchema(),
      };

      stores.push(patch);
    }
  });

  return stores;
};
