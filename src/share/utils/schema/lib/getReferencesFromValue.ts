import { traverseValue } from 'src/share/utils/schema/lib/traverseValue';
import { JsonValueStore } from 'src/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/share/utils/schema/types/schema.types';

export type GetReferencesFromValueType = {
  tableId: string;
  rowIds: string[];
};

export const getReferencesFromValue = (
  store: JsonValueStore,
): GetReferencesFromValueType[] => {
  const references = new Map<string, Set<string>>();

  traverseValue(store, (item) => {
    if (item.type === JsonSchemaTypeName.String && item.reference) {
      let tableReference = references.get(item.reference);

      if (!tableReference) {
        tableReference = new Set<string>();
        references.set(item.reference, tableReference);
      }

      tableReference.add(item.getPlainValue());
    }
  });

  return [...references].map(([tableId, rowIds]) => ({
    tableId,
    rowIds: [...rowIds].sort(),
  }));
};
