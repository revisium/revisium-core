import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ENDPOINT_COMMANDS } from 'src/features/endpoint/commands/handlers';
import { ENDPOINT_QUERIES } from 'src/features/endpoint/queries/handlers';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';

@Module({
  imports: [CqrsModule, DatabaseModule, NotificationModule],
  providers: [EndpointApiService, ...ENDPOINT_COMMANDS, ...ENDPOINT_QUERIES],
  exports: [EndpointApiService],
})
export class EndpointModule {}
