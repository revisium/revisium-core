import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { TABLE_COMMANDS_HANDLERS } from 'src/features/draft/commands/handlers';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DRAFT_REQUEST_DTO } from 'src/features/draft/draft-request-dto';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    NotificationModule,
    PluginModule,
  ],
  providers: [
    DraftTransactionalCommands,
    DraftContextService,
    ...DRAFT_REQUEST_DTO,
    ...TABLE_COMMANDS_HANDLERS,
  ],
})
export class DraftModule {}
