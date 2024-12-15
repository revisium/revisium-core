import { JsonSchemaStore } from 'src/share/utils/schema/model/schema/json-schema.store';
import { JsonSchemaTypeName } from 'src/share/utils/schema/types/schema.types';

export const getJsonSchemaStoreByPath = (
  store: JsonSchemaStore,
  path: string,
): JsonSchemaStore => {
  if (path === '') {
    return store;
  }

  if (path === '/') {
    throw new Error(
      'invalid root path, need to use path="" instead of path="/"',
    );
  }

  const tokens = path.split('/');
  tokens.shift();

  let currentStore = store;

  let currentToken = tokens.shift();
  let currentPath = '';

  while (currentToken) {
    if (currentStore.type === JsonSchemaTypeName.Object) {
      if (currentToken !== 'properties') {
        throw new Error(
          `Expected "${currentPath}/properties/*" instead of ${currentPath}/${currentToken}/*`,
        );
      }

      currentPath = `${currentPath}/${currentToken}`;

      currentToken = tokens.shift();

      if (!currentToken) {
        throw new Error(`Expected property name after "${currentPath}"`);
      }

      const foundCurrentStore = currentStore.getProperty(currentToken);

      if (!foundCurrentStore) {
        throw new Error(`Not found "${currentToken}" in "${currentPath}"`);
      }

      currentStore = foundCurrentStore;
      currentPath = `${currentPath}/${currentToken}`;

      currentToken = tokens.shift();
    } else if (currentStore.type === JsonSchemaTypeName.Array) {
      if (currentToken !== 'items') {
        throw new Error(
          `Expected "${currentPath}/items/*" instead of ${currentPath}/${currentToken}/*`,
        );
      }

      currentPath = `${currentPath}/${currentToken}`;

      currentStore = currentStore.items;

      currentToken = tokens.shift();
    } else {
      throw new Error(`Unexpected "${currentToken}" in "${currentPath}"`);
    }
  }

  return currentStore;
};
