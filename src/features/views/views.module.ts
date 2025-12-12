import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DraftModule } from 'src/features/draft/draft.module';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { VIEWS_COMMANDS_HANDLERS } from 'src/features/views/commands/handlers';
import { VIEWS_QUERIES_HANDLERS } from 'src/features/views/queries/handlers';
import { ViewValidationService } from 'src/features/views/services';
import { ViewsApiService } from 'src/features/views/views-api.service';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, DraftModule],
  providers: [
    ViewValidationService,
    ViewsApiService,
    ...VIEWS_COMMANDS_HANDLERS,
    ...VIEWS_QUERIES_HANDLERS,
  ],
  exports: [ViewValidationService, ViewsApiService],
})
export class ViewsModule {}
