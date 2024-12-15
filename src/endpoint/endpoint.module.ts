import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { ENDPOINT_COMMANDS } from 'src/endpoint/commands/handlers';
import { ENDPOINT_QUERIES } from 'src/endpoint/queries/handlers';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [CqrsModule, DatabaseModule, NotificationModule],
  providers: [...ENDPOINT_COMMANDS, ...ENDPOINT_QUERIES],
})
export class EndpointModule {}
