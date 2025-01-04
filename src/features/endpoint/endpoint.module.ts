import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ENDPOINT_COMMANDS } from 'src/features/endpoint/commands/handlers';
import { ENDPOINT_QUERIES } from 'src/features/endpoint/queries/handlers';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';

@Module({
  imports: [CqrsModule, DatabaseModule, NotificationModule],
  providers: [...ENDPOINT_COMMANDS, ...ENDPOINT_QUERIES],
})
export class EndpointModule {}
