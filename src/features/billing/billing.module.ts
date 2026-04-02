import { Global, Module } from '@nestjs/common';
import { BILLING_GRAPHQL_SERVICE_TOKEN } from './billing-graphql.interface';
import { LIMITS_SERVICE_TOKEN } from './limits.interface';
import { NoopBillingGraphqlService } from './noop-billing-graphql.service';
import { NoopLimitsService } from './noop-limits.service';

@Global()
@Module({
  providers: [
    {
      provide: LIMITS_SERVICE_TOKEN,
      useClass: NoopLimitsService,
    },
    {
      provide: BILLING_GRAPHQL_SERVICE_TOKEN,
      useClass: NoopBillingGraphqlService,
    },
  ],
  exports: [LIMITS_SERVICE_TOKEN, BILLING_GRAPHQL_SERVICE_TOKEN],
})
export class BillingModule {}
