import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AsyncLocalStorage } from 'async_hooks';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PROJECT_HANDLERS } from 'src/project/commands/handlers';
import { PROJECT_QUERIES } from 'src/project/queries/handlers';
import { ShareModule } from 'src/share/share.module';

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
