import { Injectable } from '@nestjs/common';
import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { RowCreatedAtPlugin } from 'src/features/plugin/row-created-at/row-created-at.plugin';
import { RowCreatedIdPlugin } from 'src/features/plugin/row-created-id/row-created-id.plugin';
import { RowHashPlugin } from 'src/features/plugin/row-hash/row-hash.plugin';
import { RowIdPlugin } from 'src/features/plugin/row-id/row-id.plugin';
import { RowSchemaHashPlugin } from 'src/features/plugin/row-schema-hash/row-schema-hash.plugin';
import { RowUpdatedAtPlugin } from 'src/features/plugin/row-updated-at/row-updated-at.plugin';
import { RowVersionIdPlugin } from 'src/features/plugin/row-version-id/row-version-id.plugin';
import { IPluginService } from 'src/features/plugin/types';

@Injectable()
export class PluginListService {
  public readonly orderedPlugins: IPluginService[] = [];

  constructor(
    filePlugin: FilePlugin,
    rowIdPlugin: RowIdPlugin,
    rowCreatedIdPlugin: RowCreatedIdPlugin,
    rowVersionIdPlugin: RowVersionIdPlugin,
    rowCreatedAtPlugin: RowCreatedAtPlugin,
    rowUpdatedAtPlugin: RowUpdatedAtPlugin,
    rowHashPlugin: RowHashPlugin,
    rowSchemaHashPlugin: RowSchemaHashPlugin,
  ) {
    this.orderedPlugins.push(rowIdPlugin);
    this.orderedPlugins.push(rowCreatedIdPlugin);
    this.orderedPlugins.push(rowVersionIdPlugin);
    this.orderedPlugins.push(rowCreatedAtPlugin);
    this.orderedPlugins.push(rowUpdatedAtPlugin);
    this.orderedPlugins.push(rowHashPlugin);
    this.orderedPlugins.push(rowSchemaHashPlugin);
    this.orderedPlugins.push(filePlugin);
  }
}
