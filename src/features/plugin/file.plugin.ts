import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import {
  InternalCreateRowOptions,
  IPluginService,
} from 'src/features/plugin/types';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export enum FIleStatus {
  ready = 'ready',
  error = 'error',
  completed = 'completed',
}

@Injectable()
export class FilePlugin implements IPluginService {
  public async createRow(options: InternalCreateRowOptions): Promise<void> {
    traverseValue(options.valueStore, (item) => {
      if (item.schema.$ref === SystemSchemaIds.File) {
        if (item.type === JsonSchemaTypeName.Object) {
          this.checkDefaultValues(item);
          this.prepareFile(item);
        } else {
          throw new Error('Invalid schema type');
        }
      }
    });
  }

  private prepareFile(store: JsonObjectValueStore) {
    const fileId = store.value['fileId'] as JsonStringValueStore;
    const status = store.value['status'] as JsonStringValueStore;
    status.value = FIleStatus.ready;
    fileId.value = nanoid();
  }

  private checkDefaultValues(store: JsonObjectValueStore) {
    for (const [field, item] of Object.entries(store.value)) {
      if (item.value !== item.schema.default) {
        throw new Error(
          `${field} must have default value = ${item.schema.default}`,
        );
      }
    }
  }
}
