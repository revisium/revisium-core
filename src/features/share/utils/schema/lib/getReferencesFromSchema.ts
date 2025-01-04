import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const getReferencesFromSchema = (store: JsonSchemaStore): string[] => {
  const references = new Set<string>();

  traverseStore(store, (item) => {
    if (item.type === JsonSchemaTypeName.String && item.reference) {
      references.add(item.reference);
    }
  });

  return [...references].sort();
};
