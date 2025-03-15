import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export type ReplaceForeignKeyValueOptions = {
  valueStore: JsonValueStore;
  foreignKey: string;
  value: string;
  nextValue: string;
};

export const replaceForeignKeyValue = (
  options: ReplaceForeignKeyValueOptions,
) => {
  let wasUpdated = false;

  traverseValue(options.valueStore, (item) => {
    if (
      item.type === JsonSchemaTypeName.String &&
      item.foreignKey === options.foreignKey &&
      item.value === options.value
    ) {
      item.value = options.nextValue;
      wasUpdated = true;
    }
  });

  return wasUpdated;
};
