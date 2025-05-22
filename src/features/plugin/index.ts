import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { RowCreatedAtPlugin } from 'src/features/plugin/row-created-at/row-created-at.plugin';
import { RowCreatedIdPlugin } from 'src/features/plugin/row-created-id/row-created-id.plugin';
import { RowIdPlugin } from 'src/features/plugin/row-id/row-id.plugin';
import { RowUpdatedAtPlugin } from 'src/features/plugin/row-updated-at/row-updated-at.plugin';
import { RowVersionIdPlugin } from 'src/features/plugin/row-version-id/row-version-id.plugin';

export const PLUGINS = [
  FilePlugin,
  RowIdPlugin,
  RowCreatedIdPlugin,
  RowVersionIdPlugin,
  RowCreatedAtPlugin,
  RowUpdatedAtPlugin,
];
