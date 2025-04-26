import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import {
  InternalCreateRowOptions,
  InternalUpdateRowOptions,
  IPluginService,
} from 'src/features/plugin/types';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export enum FileStatus {
  ready = 'ready',
  error = 'error',
  completed = 'uploaded',
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
    status.value = FileStatus.ready;
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

  public async updateRow(options: InternalUpdateRowOptions): Promise<void> {
    const previousFiles: Map<string, JsonObjectValueStore> = new Map();

    traverseValue(options.previousValueStore, (item) => {
      if (item.schema.$ref === SystemSchemaIds.File) {
        if (item.type === JsonSchemaTypeName.Object) {
          const fileIdStore = item.value['fileId'] as JsonStringValueStore;
          const fileId = fileIdStore.getPlainValue();
          previousFiles.set(fileId, item);
        } else {
          throw new Error('Invalid schema type');
        }
      }
    });

    traverseValue(options.valueStore, (item) => {
      if (item.schema.$ref === SystemSchemaIds.File) {
        if (item.type === JsonSchemaTypeName.Object) {
          const fileIdStore = item.value['fileId'] as JsonStringValueStore;
          const fileId = fileIdStore.getPlainValue();
          const previousFile = previousFiles.get(fileId);

          if (fileId) {
            if (!previousFile) {
              throw new Error(`File ${fileId} does not exist`);
            }

            this.checkUpdatedFile(item, previousFile);
          } else {
            this.checkDefaultValues(item);
            this.prepareFile(item);
          }
        } else {
          throw new Error('Invalid schema type');
        }
      }
    });
  }

  private checkUpdatedFile(
    file: JsonObjectValueStore,
    previousFile: JsonObjectValueStore,
  ) {
    for (const [field, item] of Object.entries(file.value)) {
      if (
        field !== 'filename' &&
        item.value !== previousFile.value[field].value
      ) {
        throw new Error(
          `${field} must have value = ${previousFile.value[field].value}`,
        );
      }
    }
  }
}
