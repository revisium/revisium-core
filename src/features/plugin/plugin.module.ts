import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FormulaValidationService } from 'src/features/plugin/formula/formula-validation.service';
import { PLUGINS } from 'src/features/plugin/index';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { StorageModule } from 'src/infrastructure/storage/storage.module';

@Module({
  imports: [DatabaseModule, ShareModule, ConfigModule, StorageModule],
  providers: [
    ...PLUGINS,
    PluginListService,
    PluginService,
    FormulaValidationService,
  ],
  exports: [PluginService, FormulaValidationService, ...PLUGINS],
})
export class PluginModule {}
