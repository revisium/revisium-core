import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notification/notification.module';
import { SHARE_COMMANDS_HANDLERS } from 'src/share/commands/handlers';
import { SHARE_QUERIES_HANDLERS } from 'src/share/queries/handlers';
import { ReferencesService } from 'src/share/references.service';
import { ShareCommands } from 'src/share/share.commands';
import { ShareTransactionalCommands } from 'src/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';

@Module({
  imports: [DatabaseModule, CqrsModule, NotificationModule],
  providers: [
    ShareTransactionalCommands,
    ShareCommands,
    ShareTransactionalQueries,
    ReferencesService,
    ...SHARE_COMMANDS_HANDLERS,
    ...SHARE_QUERIES_HANDLERS,
  ],
  exports: [
    ShareTransactionalCommands,
    ShareCommands,
    ShareTransactionalQueries,
    ReferencesService,
  ],
})
export class ShareModule {}
