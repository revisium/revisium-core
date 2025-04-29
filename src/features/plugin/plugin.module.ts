import { Module } from '@nestjs/common';
import { FilePlugin } from 'src/features/plugin/file.plugin';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule, ShareModule],
  providers: [FilePlugin, PluginListService, PluginService],
  exports: [PluginService],
})
export class PluginModule {}
