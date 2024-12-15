import { JsonSchemaStore } from 'src/share/utils/schema/model/schema/json-schema.store';
import { JsonSchemaTypeName } from 'src/share/utils/schema/types/schema.types';

export const getValuePathByStore = (store: JsonSchemaStore): string => {
  let node = store;

  let path = '';

  while (node.parent) {
    if (node.parent.type === JsonSchemaTypeName.Object) {
      path = `.${node.name}${path}`;
    } else if (node.parent.type === JsonSchemaTypeName.Array) {
      path = `[*]${path}`;
    }

    node = node.parent;
  }

  if (!path) {
    return '$';
  }

  return `$${path}`;
};
