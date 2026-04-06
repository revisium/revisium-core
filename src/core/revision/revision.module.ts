import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { RevisionApiService } from './revision-api.service';
import { REVISION_COMMAND_HANDLERS } from './commands/handlers';

@Module({
  imports: [CqrsModule, DatabaseModule, NotificationModule],
  providers: [RevisionApiService, ...REVISION_COMMAND_HANDLERS],
  exports: [RevisionApiService],
})
export class RevisionModule {}
