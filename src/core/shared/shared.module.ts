import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { BillingCheckService } from './billing-check.service';
import { EndpointNotifierService } from './endpoint-notifier.service';

// LIMITS_SERVICE_TOKEN is intentionally not imported via BillingModule here.
// BillingModule's local NoopLimitsService binding would shadow the @Global
// EeBillingModule binding to the real LimitsService when EE is loaded.
// Falling through to whichever module is registered globally lets cloud
// builds enforce limits while OSS standalone keeps the noop fallback.
@Module({
  imports: [DatabaseModule, NotificationModule],
  providers: [BillingCheckService, EndpointNotifierService],
  exports: [BillingCheckService, EndpointNotifierService],
})
export class SharedModule {}
