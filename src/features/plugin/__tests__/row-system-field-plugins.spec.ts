import { Row } from 'src/__generated__/client';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { IPluginService } from 'src/features/plugin/types';
import { RowCreatedAtPlugin } from 'src/features/plugin/row-created-at/row-created-at.plugin';
import { RowCreatedIdPlugin } from 'src/features/plugin/row-created-id/row-created-id.plugin';
import { RowHashPlugin } from 'src/features/plugin/row-hash/row-hash.plugin';
import { RowIdPlugin } from 'src/features/plugin/row-id/row-id.plugin';
import { RowPublishedAtPlugin } from 'src/features/plugin/row-published-at/row-published-at.plugin';
import { RowSchemaHashPlugin } from 'src/features/plugin/row-schema-hash/row-schema-hash.plugin';
import { RowUpdatedAtPlugin } from 'src/features/plugin/row-updated-at/row-updated-at.plugin';
import { RowVersionIdPlugin } from 'src/features/plugin/row-version-id/row-version-id.plugin';
import {
  createRowSystemFieldKit,
  createPlainSchema,
} from 'src/features/plugin/row-system-fields.test-utils';
import { JsonSchemaStoreService } from '@revisium/engine';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';

interface SystemFieldCase {
  name: string;
  fieldKey: string;
  systemSchemaId: SystemSchemaIds;
  factory: () => IPluginService;
  expectedComputed: (row: Row) => string;
}

const cases: SystemFieldCase[] = [
  {
    name: 'RowIdPlugin',
    fieldKey: '_id',
    systemSchemaId: SystemSchemaIds.RowId,
    factory: () => new RowIdPlugin(),
    expectedComputed: (row) => row.id,
  },
  {
    name: 'RowCreatedIdPlugin',
    fieldKey: '_createdId',
    systemSchemaId: SystemSchemaIds.RowCreatedId,
    factory: () => new RowCreatedIdPlugin(),
    expectedComputed: (row) => row.createdId,
  },
  {
    name: 'RowVersionIdPlugin',
    fieldKey: '_versionId',
    systemSchemaId: SystemSchemaIds.RowVersionId,
    factory: () => new RowVersionIdPlugin(),
    expectedComputed: (row) => row.versionId,
  },
  {
    name: 'RowHashPlugin',
    fieldKey: '_hash',
    systemSchemaId: SystemSchemaIds.RowHash,
    factory: () => new RowHashPlugin(),
    expectedComputed: (row) => row.hash,
  },
  {
    name: 'RowSchemaHashPlugin',
    fieldKey: '_schemaHash',
    systemSchemaId: SystemSchemaIds.RowSchemaHash,
    factory: () => new RowSchemaHashPlugin(),
    expectedComputed: (row) => row.schemaHash,
  },
  {
    name: 'RowCreatedAtPlugin',
    fieldKey: '_createdAt',
    systemSchemaId: SystemSchemaIds.RowCreatedAt,
    factory: () => new RowCreatedAtPlugin(),
    expectedComputed: (row) => row.createdAt.toISOString(),
  },
  {
    name: 'RowUpdatedAtPlugin',
    fieldKey: '_updatedAt',
    systemSchemaId: SystemSchemaIds.RowUpdatedAt,
    factory: () => new RowUpdatedAtPlugin(),
    expectedComputed: (row) => row.updatedAt.toISOString(),
  },
  {
    name: 'RowPublishedAtPlugin',
    fieldKey: '_publishedAt',
    systemSchemaId: SystemSchemaIds.RowPublishedAt,
    factory: () => new RowPublishedAtPlugin(),
    expectedComputed: (row) => row.publishedAt.toISOString(),
  },
];

describe.each(cases)(
  '$name (system field $fieldKey)',
  ({ factory, fieldKey, systemSchemaId, expectedComputed }) => {
    const kit = createRowSystemFieldKit({
      factory,
      fieldKey,
      systemSchemaId,
    });

    it('reports isAvailable as true', () => {
      expect(factory().isAvailable).toBe(true);
    });

    it('clears the matching field on afterCreateRow', () => {
      expect(kit.runAfterCreateRow('previous-value')).toBe('');
    });

    it('clears the matching field on afterUpdateRow', () => {
      expect(kit.runAfterUpdateRow('previous-value')).toBe('');
    });

    it('writes the row-derived value into the matching field on computeRows', () => {
      const { row, value } = kit.runComputeRows();
      expect(value).toBe(expectedComputed(row));
    });

    it('clears the matching field on afterMigrateRows', () => {
      expect(kit.runAfterMigrateRows().value).toBe('');
    });

    it('does not touch user fields when the schema has no matching system $ref', () => {
      expect(kit.probePlainSchema()).toBe('unchanged');
    });
  },
);

describe('RowPublishedAtPlugin.getPublishedAt', () => {
  const kit = createRowSystemFieldKit({
    factory: () => new RowPublishedAtPlugin(),
    fieldKey: '_publishedAt',
    systemSchemaId: SystemSchemaIds.RowPublishedAt,
  });

  it('returns the populated value', () => {
    const valueStore = kit.buildValueStore('2025-04-05T06:07:08.000Z');
    const plugin = new RowPublishedAtPlugin();

    expect(plugin.getPublishedAt(valueStore)).toBe('2025-04-05T06:07:08.000Z');
  });

  it('returns "" when the field is empty (treats "" as set)', () => {
    expect(
      new RowPublishedAtPlugin().getPublishedAt(kit.buildValueStore('')),
    ).toBe('');
  });

  it('returns undefined when the schema has no matching system field', () => {
    const schemaStore = new JsonSchemaStoreService().create(
      createPlainSchema(),
    );
    const valueStore = createJsonValueStore(schemaStore, '', { name: 'x' });

    expect(
      new RowPublishedAtPlugin().getPublishedAt(valueStore),
    ).toBeUndefined();
  });
});
