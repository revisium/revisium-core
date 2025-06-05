import { Injectable } from '@nestjs/common';
import {
  InternalAfterCreateRowOptions,
  InternalAfterMigrateRowsOptions,
  InternalAfterUpdateRowOptions,
  InternalComputeRowsOptions,
  IPluginService,
} from 'src/features/plugin/types';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

@Injectable()
export class RowPublishedAtPlugin implements IPluginService {
  public readonly isAvailable = true;

  constructor() {}

  public afterCreateRow(options: InternalAfterCreateRowOptions) {
    this.setPublishedAt(options.valueStore, '');
  }

  public afterUpdateRow(options: InternalAfterUpdateRowOptions) {
    this.setPublishedAt(options.valueStore, '');
  }

  public computeRows(options: InternalComputeRowsOptions) {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      this.setPublishedAt(valueStore, row.publishedAt.toISOString());

      row.data = valueStore.getPlainValue();
    }
  }

  public afterMigrateRows(options: InternalAfterMigrateRowsOptions) {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      this.setPublishedAt(valueStore, '');

      row.data = valueStore.getPlainValue();
    }
  }

  public getPublishedAt(valueStore: JsonValueStore): string | undefined {
    const publishedAtList: string[] = [];

    this.forEachRow(valueStore, (item) => {
      if (item.value !== null) {
        publishedAtList.push(item.value);
      }
    });

    return publishedAtList[0] ?? undefined;
  }

  private forEachRow(
    valueStore: JsonValueStore,
    callback: (store: JsonStringValueStore) => void,
  ) {
    traverseValue(valueStore, (item) => {
      if (
        item.schema.$ref === SystemSchemaIds.RowPublishedAt &&
        item.type === JsonSchemaTypeName.String
      ) {
        callback(item);
      }
    });
  }

  private setPublishedAt(valueStore: JsonValueStore, value: string) {
    this.forEachRow(valueStore, (item) => {
      item.value = value;
    });
  }
}
