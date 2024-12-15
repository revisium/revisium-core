import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BRANCH_COMMANDS_HANDLERS } from 'src/branch/commands/handlers';
import { BRANCH_QUERIES_HANDLERS } from 'src/branch/quieries/handlers';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notification/notification.module';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, NotificationModule],
  providers: [...BRANCH_QUERIES_HANDLERS, ...BRANCH_COMMANDS_HANDLERS],
})
export class BranchModule {}
