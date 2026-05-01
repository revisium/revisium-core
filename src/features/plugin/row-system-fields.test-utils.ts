import { Row } from 'src/__generated__/client';
import { JsonSchemaStoreService } from '@revisium/engine';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { JsonSchema, JsonValue } from '@revisium/schema-toolkit/types';
import { JsonValueStore } from '@revisium/schema-toolkit/model';
import { IPluginService } from 'src/features/plugin/types';

export interface RowFixtureOverrides {
  id?: string;
  versionId?: string;
  createdId?: string;
  hash?: string;
  schemaHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

export const createRowFixture = (
  data: Record<string, unknown>,
  overrides: RowFixtureOverrides = {},
): Row => ({
  id: overrides.id ?? 'row-1',
  versionId: overrides.versionId ?? 'version-1',
  createdId: overrides.createdId ?? 'created-1',
  hash: overrides.hash ?? 'hash-1',
  schemaHash: overrides.schemaHash ?? 'schema-hash-1',
  readonly: false,
  data: data as JsonValue,
  meta: {} as JsonValue,
  createdAt: overrides.createdAt ?? new Date('2025-01-02T03:04:05.000Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-02-03T04:05:06.000Z'),
  publishedAt: overrides.publishedAt ?? new Date('2025-03-04T05:06:07.000Z'),
});

export const createSchemaWithSystemField = (
  fieldName: string,
  systemSchemaId: string,
): JsonSchema =>
  ({
    type: 'object',
    properties: {
      [fieldName]: { type: 'string', default: '', $ref: systemSchemaId },
    },
    additionalProperties: false,
    required: [fieldName],
  }) as JsonSchema;

const PLAIN_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', default: '' } },
  additionalProperties: false,
  required: ['name'],
} as JsonSchema;

export const createPlainSchema = (): JsonSchema => PLAIN_SCHEMA;

const buildStores = (schema: JsonSchema, data: JsonValue) => {
  const schemaStore = new JsonSchemaStoreService().create(schema);
  const valueStore: JsonValueStore = createJsonValueStore(
    schemaStore,
    '',
    data,
  );
  return { schemaStore, valueStore };
};

export const valueAt = (valueStore: JsonValueStore, key: string): unknown =>
  (valueStore.getPlainValue() as Record<string, unknown>)[key];

export interface RowSystemFieldKit {
  /** Run afterCreateRow with `{ [fieldKey]: initial }` and return the field value after. */
  runAfterCreateRow(initial: string): unknown;
  /** Run afterUpdateRow and return the field value after. */
  runAfterUpdateRow(initial: string): unknown;
  /** Run computeRows over a single fixture row and return its `data[fieldKey]`. */
  runComputeRows(overrides?: RowFixtureOverrides): { row: Row; value: unknown };
  /** Run afterMigrateRows over a single fixture row and return its `data[fieldKey]`. */
  runAfterMigrateRows(overrides?: RowFixtureOverrides): {
    row: Row;
    value: unknown;
  };
  /**
   * Probe whether the plugin touches user fields when the schema has no matching
   * `$ref`. Returns the user field value after `afterCreateRow`.
   */
  probePlainSchema(): unknown;
  /** Direct access to a fresh value store with the given seed value. */
  buildValueStore(seed: string): JsonValueStore;
}

export interface RowSystemFieldKitConfig {
  factory: () => IPluginService;
  fieldKey: string;
  systemSchemaId: string;
}

export const createRowSystemFieldKit = (
  config: RowSystemFieldKitConfig,
): RowSystemFieldKit => {
  const schema = createSchemaWithSystemField(
    config.fieldKey,
    config.systemSchemaId,
  );

  const buildValueStore = (seed: string): JsonValueStore =>
    buildStores(schema, { [config.fieldKey]: seed }).valueStore;

  return {
    runAfterCreateRow(initial) {
      const plugin = config.factory();
      const { schemaStore, valueStore } = buildStores(schema, {
        [config.fieldKey]: initial,
      });

      plugin.afterCreateRow({
        revisionId: 'rev-1',
        tableId: 'table-1',
        rowId: 'row-1',
        data: { [config.fieldKey]: initial },
        schemaStore,
        valueStore,
      });

      return valueAt(valueStore, config.fieldKey);
    },
    runAfterUpdateRow(initial) {
      const plugin = config.factory();
      const { schemaStore, valueStore } = buildStores(schema, {
        [config.fieldKey]: initial,
      });
      const previousValueStore = buildStores(schema, {
        [config.fieldKey]: 'older',
      }).valueStore;

      plugin.afterUpdateRow({
        revisionId: 'rev-1',
        tableId: 'table-1',
        rowId: 'row-1',
        data: { [config.fieldKey]: initial },
        schemaStore,
        valueStore,
        previousValueStore,
      });

      return valueAt(valueStore, config.fieldKey);
    },
    runComputeRows(overrides = {}) {
      const plugin = config.factory();
      const { schemaStore } = buildStores(schema, { [config.fieldKey]: '' });
      const row = createRowFixture({ [config.fieldKey]: 'stale' }, overrides);

      plugin.computeRows({
        revisionId: 'rev-1',
        tableId: 'table-1',
        rows: [row],
        schemaStore,
      });

      return {
        row,
        value: (row.data as Record<string, unknown>)[config.fieldKey],
      };
    },
    runAfterMigrateRows(overrides = {}) {
      const plugin = config.factory();
      const { schemaStore } = buildStores(schema, { [config.fieldKey]: '' });
      const row = createRowFixture({ [config.fieldKey]: 'stale' }, overrides);

      plugin.afterMigrateRows({
        revisionId: 'rev-1',
        tableId: 'table-1',
        rows: [row],
        schemaStore,
      });

      return {
        row,
        value: (row.data as Record<string, unknown>)[config.fieldKey],
      };
    },
    probePlainSchema() {
      const plugin = config.factory();
      const { schemaStore, valueStore } = buildStores(PLAIN_SCHEMA, {
        name: 'unchanged',
      });

      plugin.afterCreateRow({
        revisionId: 'rev-1',
        tableId: 'table-1',
        rowId: 'row-1',
        data: { name: 'unchanged' },
        schemaStore,
        valueStore,
      });

      return valueAt(valueStore, 'name');
    },
    buildValueStore,
  };
};
