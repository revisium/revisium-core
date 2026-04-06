import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { BillingCheckService } from './billing-check.service';
import { EndpointNotifierService } from './endpoint-notifier.service';

@Module({
  imports: [DatabaseModule, NotificationModule],
  providers: [BillingCheckService, EndpointNotifierService],
  exports: [BillingCheckService, EndpointNotifierService],
})
export class SharedModule {}
