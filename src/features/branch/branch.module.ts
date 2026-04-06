import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { SharedModule } from 'src/core/shared/shared.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { BRANCH_COMMAND_HANDLERS } from './commands/handlers';

@Module({
  imports: [DatabaseModule, CqrsModule, SharedModule],
  providers: [BranchApiService, ...BRANCH_COMMAND_HANDLERS],
  exports: [BranchApiService],
})
export class BranchModule {}
