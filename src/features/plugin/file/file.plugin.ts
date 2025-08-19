import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { FileStatus, ID_LENGTH } from 'src/features/plugin/file/consts';
import { FileValueStore } from 'src/features/plugin/file/file-value.store';
import { forEachFile } from 'src/features/plugin/file/utils/fore-each-file';
import { validateFileDataForRestore } from 'src/features/plugin/file/utils/validate-file-data-for-restore';
import {
  InternalAfterCreateRowOptions,
  InternalAfterMigrateRowsOptions,
  InternalAfterUpdateRowOptions,
  InternalComputeRowsOptions,
  IPluginService,
} from 'src/features/plugin/types';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { S3Service } from 'src/infrastructure/database/s3.service';

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

  public async afterCreateRow(
    options: InternalAfterCreateRowOptions,
  ): Promise<void> {
    if (options.isRestore) {
      forEachFile(options.valueStore, (item) => {
        item.url = '';
        validateFileDataForRestore(item, options.valueStore);
      });
    } else {
      forEachFile(options.valueStore, (item) => {
        item.ensureDefaults();
        this.prepareReadyFile(item);
      });
    }
  }

  public async afterUpdateRow(
    options: InternalAfterUpdateRowOptions,
  ): Promise<void> {
    if (options.isRestore) {
      forEachFile(options.valueStore, (item) => {
        item.url = '';
        validateFileDataForRestore(item, options.valueStore);
      });
    } else {
      const previousFiles: Map<string, FileValueStore> = new Map();

      forEachFile(options.previousValueStore, (item) => {
        previousFiles.set(item.fileId, item);
      });

      forEachFile(options.valueStore, (item) => {
        const previousFile = previousFiles.get(item.fileId);

        if (item.fileId) {
          if (!previousFile) {
            throw new Error(`File ${item.fileId} does not exist`);
          }

          item.checkImmutable(previousFile);
          item.url = '';
        } else {
          item.ensureDefaults();
          this.prepareReadyFile(item);
        }
      });
    }
  }

  public async computeRows(options: InternalComputeRowsOptions): Promise<void> {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      forEachFile(valueStore, (item) => {
        if (item.status === FileStatus.uploaded) {
          item.url = this.getUrl(item.hash);
        }
      });

      row.data = valueStore.getPlainValue();
    }
  }

  public async afterMigrateRows(
    options: InternalAfterMigrateRowsOptions,
  ): Promise<void> {
    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      forEachFile(valueStore, (item) => {
        if (!item.fileId) {
          item.ensureDefaults();
          this.prepareReadyFile(item);
        }
      });

      row.data = valueStore.getPlainValue();
    }
  }

  public async uploadFile({
    valueStore,
    fileId,
    file,
  }: {
    valueStore: JsonValueStore;
    fileId: string;
    file: Express.Multer.File;
  }): Promise<FileValueStore> {
    const files: FileValueStore[] = [];

    forEachFile(valueStore, (item) => {
      if (item.fileId === fileId) {
        files.push(item);
      }
    });

    if (files.length !== 1) {
      throw new Error('Invalid count of files');
    }

    const fileStore = files[0];
    await fileStore.uploadFile(file);
    return fileStore;
  }

  public getUrl(hash: string) {
    return encodeURI(`${this.publicEndpoint}/${this.getPathname(hash)}`);
  }

  public getPathname(hash: string) {
    return encodeURI(`${hash}`);
  }

  private prepareReadyFile(store: FileValueStore) {
    store.status = FileStatus.ready;
    store.fileId = nanoid(ID_LENGTH);
  }
}
