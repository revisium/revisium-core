import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BranchModule } from 'src/features/branch/branch.module';
import { DRAFT_REVISION_COMMANDS_HANDLERS } from 'src/features/draft-revision/commands/handlers';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { RevisionModule } from 'src/features/revision/revision.module';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    CqrsModule,
    ShareModule,
    RevisionModule,
    BranchModule,
  ],
  providers: [
    DraftRevisionApiService,
    DraftRevisionInternalService,
    DraftRevisionValidationService,
    ...DRAFT_REVISION_COMMANDS_HANDLERS,
  ],
  exports: [DraftRevisionApiService, DraftRevisionInternalService],
})
export class DraftRevisionModule {}
