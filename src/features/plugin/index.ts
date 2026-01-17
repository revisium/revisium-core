import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { FormulaPlugin } from 'src/features/plugin/formula/formula.plugin';
import { RowCreatedAtPlugin } from 'src/features/plugin/row-created-at/row-created-at.plugin';
import { RowCreatedIdPlugin } from 'src/features/plugin/row-created-id/row-created-id.plugin';
import { RowHashPlugin } from 'src/features/plugin/row-hash/row-hash.plugin';
import { RowIdPlugin } from 'src/features/plugin/row-id/row-id.plugin';
import { RowSchemaHashPlugin } from 'src/features/plugin/row-schema-hash/row-schema-hash.plugin';
import { RowUpdatedAtPlugin } from 'src/features/plugin/row-updated-at/row-updated-at.plugin';
import { RowVersionIdPlugin } from 'src/features/plugin/row-version-id/row-version-id.plugin';
import { RowPublishedAtPlugin } from './row-published-at/row-published-at.plugin';

export const PLUGINS = [
  FilePlugin,
  FormulaPlugin,
  RowIdPlugin,
  RowCreatedIdPlugin,
  RowVersionIdPlugin,
  RowCreatedAtPlugin,
  RowPublishedAtPlugin,
  RowUpdatedAtPlugin,
  RowHashPlugin,
  RowSchemaHashPlugin,
];
