import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { TableApiService } from 'src/features/table/table-api.service';
import { TABLE_COMMAND_HANDLERS } from './commands/handlers';
import { SharedModule } from 'src/core/shared/shared.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    NotificationModule,
    PluginModule,
    SharedModule,
  ],
  providers: [TableApiService, ...TABLE_COMMAND_HANDLERS],
  exports: [TableApiService],
})
export class TableModule {}
