import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notification/notification.module';
import { REVISION_QUERIES_HANDLERS } from 'src/revision/queries/commands';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, NotificationModule],
  providers: [...REVISION_QUERIES_HANDLERS],
})
export class RevisionModule {}
