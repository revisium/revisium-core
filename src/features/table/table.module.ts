import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { TableApiService } from 'src/features/table/table-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { ShareModule } from 'src/features/share/share.module';
import { TABLE_QUERIES_HANDLERS } from 'src/features/table/queries/handlers';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    NotificationModule,
    ShareModule,
    PluginModule,
  ],
  providers: [...TABLE_QUERIES_HANDLERS, TableApiService],
  exports: [TableApiService],
})
export class TableModule {}
