import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { GetEndpointsByRevisionIdHandler } from 'src/features/revision/queries/commands/get-endpoints-by-revision-id.handler';
import { REVISION_COMMAND_HANDLERS } from './commands/handlers';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, NotificationModule],
  providers: [
    RevisionsApiService,
    GetEndpointsByRevisionIdHandler,
    ...REVISION_COMMAND_HANDLERS,
  ],
  exports: [RevisionsApiService],
})
export class RevisionModule {}
