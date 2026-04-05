import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemColumnMappingService } from 'src/features/row/services';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, PluginModule],
  providers: [RowApiService, SystemColumnMappingService],
  exports: [RowApiService, SystemColumnMappingService],
})
export class RowModule {}
