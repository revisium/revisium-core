import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { InternalRowApiService } from 'src/features/row/internal-row-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemColumnMappingService } from 'src/features/row/services';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ROW_QUERIES_HANDLERS } from 'src/features/row/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, PluginModule],
  providers: [
    InternalRowApiService,
    RowApiService,
    SystemColumnMappingService,
    ...ROW_QUERIES_HANDLERS,
  ],
  exports: [RowApiService, SystemColumnMappingService],
})
export class RowModule {}
