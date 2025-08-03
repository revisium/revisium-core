import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { MigrationContextService } from 'src/features/draft/migration-context.service';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { DRAFT_COMMANDS_HANDLERS } from 'src/features/draft/commands/handlers';
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
    DraftApiService,
    DraftContextService,
    MigrationContextService,
    ...DRAFT_REQUEST_DTO,
    ...DRAFT_COMMANDS_HANDLERS,
  ],
  exports: [DraftApiService],
})
export class DraftModule {}
