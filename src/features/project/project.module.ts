import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AsyncLocalStorage } from 'async_hooks';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { PROJECT_HANDLERS } from 'src/features/project/commands/handlers';
import { PROJECT_QUERIES } from 'src/features/project/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, ShareModule, NotificationModule, CqrsModule],
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
    ...PROJECT_QUERIES,
    ...PROJECT_HANDLERS,
  ],
})
export class ProjectModule {}
