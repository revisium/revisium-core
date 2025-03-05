import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export type GetForeignKeysFromValueType = {
  tableId: string;
  rowIds: string[];
};

export const getForeignKeysFromValue = (
  store: JsonValueStore,
): GetForeignKeysFromValueType[] => {
  const foreignKeys = new Map<string, Set<string>>();

  traverseValue(store, (item) => {
    if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
      let tableForeignKey = foreignKeys.get(item.foreignKey);

      if (!tableForeignKey) {
        tableForeignKey = new Set<string>();
        foreignKeys.set(item.foreignKey, tableForeignKey);
      }

      tableForeignKey.add(item.getPlainValue());
    }
  });

  return [...foreignKeys].map(([tableId, rowIds]) => ({
    tableId,
    rowIds: [...rowIds].sort((a, b) => a.localeCompare(b)),
  }));
};
