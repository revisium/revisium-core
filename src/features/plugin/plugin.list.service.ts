import { Injectable } from '@nestjs/common';
import { FilePlugin } from 'src/features/plugin/file.plugin';
import { IPluginService } from 'src/features/plugin/types';

@Injectable()
export class PluginListService {
  public readonly orderedPlugins: IPluginService[] = [];

  constructor(filePlugin: FilePlugin) {
    this.orderedPlugins.push(filePlugin);
  }
}
