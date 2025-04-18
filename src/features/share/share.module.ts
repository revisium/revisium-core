import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DiffService } from 'src/features/share/diff.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { SHARE_COMMANDS_HANDLERS } from 'src/features/share/commands/handlers';
import { SHARE_QUERIES_HANDLERS } from 'src/features/share/queries/handlers';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@Module({
  imports: [DatabaseModule, CqrsModule, NotificationModule],
  providers: [
    ShareTransactionalCommands,
    ShareCommands,
    ShareTransactionalQueries,
    ForeignKeysService,
    DiffService,
    JsonSchemaStoreService,
    ...SHARE_COMMANDS_HANDLERS,
    ...SHARE_QUERIES_HANDLERS,
  ],
  exports: [
    ShareTransactionalCommands,
    ShareCommands,
    ShareTransactionalQueries,
    ForeignKeysService,
    DiffService,
    JsonSchemaStoreService,
  ],
})
export class ShareModule {}
