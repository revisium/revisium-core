import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { REVISION_QUERIES_HANDLERS } from 'src/features/revision/queries/commands';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, NotificationModule],
  providers: [RevisionsApiService, ...REVISION_QUERIES_HANDLERS],
  exports: [RevisionsApiService],
})
export class RevisionModule {}
