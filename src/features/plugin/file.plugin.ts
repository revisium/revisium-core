import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import {
  InternalComputeRowsOptions,
  InternalCreateRowOptions,
  InternalMigrateRowsOptions,
  InternalUpdateRowOptions,
  IPluginService,
} from 'src/features/plugin/types';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { S3Service } from 'src/infrastructure/database/s3.service';

export enum FileStatus {
  ready = 'ready',
  error = 'error',
  uploaded = 'uploaded',
}

@Injectable()
export class FilePlugin implements IPluginService {
  public readonly publicEndpoint: string;

  constructor(
    private readonly s3Service: S3Service,
    configService: ConfigService,
  ) {
    const endpoint = configService.get('FILE_PLUGIN_PUBLIC_ENDPOINT');

    this.publicEndpoint = endpoint ?? '';
  }

  public get isAvailable() {
    return this.s3Service.isAvailable;
  }

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

            const urlStore = item.value['url'] as JsonStringValueStore;
            urlStore.value = '';
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
        field !== 'fileName' &&
        field !== 'url' &&
        item.value !== previousFile.value[field].value
      ) {
        throw new Error(
          `${field} must have value = ${previousFile.value[field].value}`,
        );
      }
    }
  }

  public async computeRows(options: InternalComputeRowsOptions): Promise<void> {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      traverseValue(valueStore, (item) => {
        if (item.schema.$ref === SystemSchemaIds.File) {
          if (item.type === JsonSchemaTypeName.Object) {
            const fieldIdStore = item.value['fileId'] as JsonStringValueStore;
            const statusStore = item.value['status'] as JsonStringValueStore;
            const fromRowVersionIdStore = item.value[
              'fromRowVersionId'
            ] as JsonStringValueStore;

            if (statusStore.getPlainValue() === FileStatus.uploaded) {
              const urlStore = item.value['url'] as JsonStringValueStore;
              urlStore.value = encodeURI(
                `${this.publicEndpoint}/admin/${fieldIdStore.getPlainValue()}-${fromRowVersionIdStore.getPlainValue()}`,
              );
            }
          } else {
            throw new Error('Invalid schema type');
          }
        }
      });

      row.data = valueStore.getPlainValue();
    }
  }

  public async migrateRows(options: InternalMigrateRowsOptions): Promise<void> {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      traverseValue(valueStore, (item) => {
        if (item.schema.$ref === SystemSchemaIds.File) {
          if (item.type === JsonSchemaTypeName.Object) {
            const fileIdStore = item.value['fileId'] as JsonStringValueStore;
            const fileId = fileIdStore.getPlainValue();

            if (!fileId) {
              this.checkDefaultValues(item);
              this.prepareFile(item);
            }
          } else {
            throw new Error('Invalid schema type');
          }
        }
      });

      row.data = valueStore.getPlainValue();
    }
  }
}
