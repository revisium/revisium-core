import { Injectable } from '@nestjs/common';
import {
  InternalAfterCreateRowOptions,
  InternalAfterMigrateRowsOptions,
  InternalAfterUpdateRowOptions,
  InternalComputeRowsOptions,
  IPluginService,
} from 'src/features/plugin/types';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import {
  createJsonValueStore,
  traverseValue,
} from '@revisium/schema-toolkit/lib';
import {
  JsonStringValueStore,
  JsonValueStore,
} from '@revisium/schema-toolkit/model';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';

@Injectable()
export class RowIdPlugin implements IPluginService {
  public readonly isAvailable = true;

  constructor() {}

  public afterCreateRow(options: InternalAfterCreateRowOptions) {
    this.setId(options.valueStore, '');
  }

  public afterUpdateRow(options: InternalAfterUpdateRowOptions) {
    this.setId(options.valueStore, '');
  }

  public computeRows(options: InternalComputeRowsOptions) {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      this.setId(valueStore, row.id);

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

      this.setId(valueStore, '');

      row.data = valueStore.getPlainValue();
    }
  }

  private forEachRow(
    valueStore: JsonValueStore,
    callback: (store: JsonStringValueStore) => void,
  ) {
    traverseValue(valueStore, (item) => {
      if (
        item.schema.$ref === SystemSchemaIds.RowId &&
        item.type === JsonSchemaTypeName.String
      ) {
        callback(item);
      }
    });
  }

  private setId(valueStore: JsonValueStore, value: string) {
    this.forEachRow(valueStore, (item) => {
      item.value = value;
    });
  }
}
