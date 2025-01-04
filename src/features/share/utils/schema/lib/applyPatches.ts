import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getJsonSchemaStoreByPath } from 'src/features/share/utils/schema/lib/getJsonSchemaStoreByPath';
import { getParentForPath } from 'src/features/share/utils/schema/lib/getParentForPath';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import {
  JsonPatchAdd,
  JsonPatchMove,
  JsonPatchRemove,
  JsonPatchReplace,
} from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const applyReplacePatch = (
  store: JsonSchemaStore,
  patch: JsonPatchReplace,
): JsonSchemaStore => {
  const patchStore = createJsonSchemaStore(patch.value);
  const foundStore = getJsonSchemaStoreByPath(store, patch.path);

  const parent = foundStore.parent;

  if (!parent) {
    return patchStore;
  }

  if (parent.type === JsonSchemaTypeName.Object) {
    parent.migratePropertyWithStore(foundStore.name, patchStore);
  } else if (parent.type === JsonSchemaTypeName.Array) {
    parent.migrateItems(patchStore);
  } else {
    throw new Error('Invalid parent');
  }

  return store;
};

export const applyRemovePatch = (
  rootStore: JsonSchemaStore,
  patch: JsonPatchRemove,
): void => {
  const foundStore = getJsonSchemaStoreByPath(rootStore, patch.path);
  const parent = foundStore.parent;

  if (!parent) {
    throw new Error('Parent does not exist');
  }

  if (parent.type !== JsonSchemaTypeName.Object) {
    throw new Error('Cannot remove from non-object');
  }

  parent.removeProperty(foundStore.name);
};

export const applyAddPatch = (
  rootStore: JsonSchemaStore,
  patch: JsonPatchAdd,
): void => {
  const patchStore = createJsonSchemaStore(patch.value);

  const { parentPath, field } = getParentForPath(patch.path);
  const foundParent = getJsonSchemaStoreByPath(rootStore, parentPath);

  if (!foundParent) {
    throw new Error('Parent does not exist');
  }

  if (foundParent.type !== JsonSchemaTypeName.Object) {
    throw new Error('Cannot add to non-object');
  }

  if (foundParent.getProperty(field)) {
    throw new Error(`Field "${field}" already exists in parent`);
  }

  foundParent.addPropertyWithStore(field, patchStore);
};

export const applyMovePatch = (
  store: JsonSchemaStore,
  patch: JsonPatchMove,
): void => {
  const { parentPath: fromParentPath, field: fromField } = getParentForPath(
    patch.from,
  );
  const { parentPath: toParentPath, field: toField } = getParentForPath(
    patch.path,
  );

  const foundFromParent = getJsonSchemaStoreByPath(store, fromParentPath);
  const foundToParent = getJsonSchemaStoreByPath(store, toParentPath);

  if (!foundFromParent || !foundToParent) {
    throw new Error('Cannot move from or to non-existent parent');
  }

  if (foundFromParent.type !== JsonSchemaTypeName.Object) {
    throw new Error('Cannot move from non-object parent');
  }

  const foundFromField = getJsonSchemaStoreByPath(store, patch.from);

  const isMovedPropertyInSameParentPatch =
    foundFromParent === foundToParent &&
    foundFromParent.type === JsonSchemaTypeName.Object &&
    foundFromParent.getProperty(fromField);

  if (isMovedPropertyInSameParentPatch) {
    return foundFromParent.changeName(fromField, toField);
  }

  if (foundToParent.type === JsonSchemaTypeName.Object) {
    foundFromParent.removeProperty(fromField);
    if (foundToParent.getProperty(toField)) {
      foundToParent.removeProperty(toField);
    }
    foundToParent.addPropertyWithStore(toField, foundFromField);
    return;
  }

  if (foundToParent.type === JsonSchemaTypeName.Array) {
    foundFromParent.removeProperty(fromField);
    foundToParent.replaceItems(foundFromField);

    return;
  }
  throw new Error('Invalid type of "to" parent');
};
