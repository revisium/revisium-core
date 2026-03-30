import { Global, Module } from '@nestjs/common';
import { LIMITS_SERVICE_TOKEN } from './limits.interface';
import { NoopLimitsService } from './noop-limits.service';

@Global()
@Module({
  providers: [
    {
      provide: LIMITS_SERVICE_TOKEN,
      useClass: NoopLimitsService,
    },
  ],
  exports: [LIMITS_SERVICE_TOKEN],
})
export class BillingModule {}
