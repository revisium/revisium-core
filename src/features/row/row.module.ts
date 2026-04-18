import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemColumnMappingService } from 'src/features/row/services/system-column-mapping.service';
import { ROW_COMMAND_HANDLERS } from './commands/handlers';
import { SharedModule } from 'src/core/shared/shared.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    PluginModule,
    SharedModule,
  ],
  providers: [
    RowApiService,
    SystemColumnMappingService,
    ...ROW_COMMAND_HANDLERS,
  ],
  exports: [RowApiService, SystemColumnMappingService],
})
export class RowModule {}
