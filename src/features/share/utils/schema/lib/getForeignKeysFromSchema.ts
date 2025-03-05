import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const getForeignKeysFromSchema = (store: JsonSchemaStore): string[] => {
  const foreignKeys = new Set<string>();

  traverseStore(store, (item) => {
    if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
      foreignKeys.add(item.foreignKey);
    }
  });

  return [...foreignKeys].sort((a, b) => a.localeCompare(b));
};
