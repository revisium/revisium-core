import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notification/notification.module';
import { ShareModule } from 'src/share/share.module';
import { TABLE_QUERIES_HANDLERS } from 'src/table/queries/handlers';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    NotificationModule,
    ShareModule,
  ],
  providers: [...TABLE_QUERIES_HANDLERS],
})
export class TableModule {}
