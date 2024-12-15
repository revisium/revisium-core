import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { TABLE_COMMANDS_HANDLERS } from 'src/draft/commands/handlers';
import { DraftContextService } from 'src/draft/draft-context.service';
import { DRAFT_REQUEST_DTO } from 'src/draft/draft-request-dto';
import { DraftTransactionalCommands } from 'src/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/draft/json-schema-validator.service';
import { SessionChangelogService } from 'src/draft/session-changelog.service';
import { NotificationModule } from 'src/notification/notification.module';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    NotificationModule,
    CacheModule.register(),
  ],
  providers: [
    DraftTransactionalCommands,
    SessionChangelogService,
    DraftContextService,
    JsonSchemaValidatorService,
    ...DRAFT_REQUEST_DTO,
    ...TABLE_COMMANDS_HANDLERS,
  ],
})
export class DraftModule {}
