import { Injectable } from '@nestjs/common';
import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { RowIdPlugin } from 'src/features/plugin/row-id/row-id.plugin';
import { IPluginService } from 'src/features/plugin/types';

@Injectable()
export class PluginListService {
  public readonly orderedPlugins: IPluginService[] = [];

  constructor(filePlugin: FilePlugin, rowIdPlugin: RowIdPlugin) {
    this.orderedPlugins.push(rowIdPlugin);
    this.orderedPlugins.push(filePlugin);
  }
}
