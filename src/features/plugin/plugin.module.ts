import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FormulaService } from 'src/features/plugin/formula';
import { PLUGINS } from 'src/features/plugin/index';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule, ShareModule, ConfigModule],
  providers: [...PLUGINS, PluginListService, PluginService, FormulaService],
  exports: [PluginService, FormulaService, ...PLUGINS],
})
export class PluginModule {}
