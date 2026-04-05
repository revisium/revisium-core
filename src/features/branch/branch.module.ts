import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { BRANCH_QUERIES_HANDLERS } from 'src/features/branch/quieries/handlers';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, NotificationModule],
  providers: [...BRANCH_QUERIES_HANDLERS, BranchApiService],
  exports: [BranchApiService],
})
export class BranchModule {}
