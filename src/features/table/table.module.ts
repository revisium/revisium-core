import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
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
  ],
  providers: [...TABLE_QUERIES_HANDLERS],
})
export class TableModule {}
