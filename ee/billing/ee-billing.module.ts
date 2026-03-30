import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { LIMITS_SERVICE_TOKEN } from 'src/features/billing/limits.interface';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { BILLING_CACHE_INVALIDATION_HANDLERS } from './cache/billing-cache-invalidation.handler';
import { BillingCacheService } from './cache/billing-cache.service';
import { LimitsService } from './limits/limits.service';
import { HardcodedPlanProvider } from './plan/hardcoded-plan-provider';
import { PLAN_PROVIDER_TOKEN } from './plan/plan.interface';
import { UsageService } from './usage/usage.service';
import { UsageTrackingService } from './usage/usage-tracking.service';

@Module({})
export class EeBillingModule {
  static register(): DynamicModule {
    return {
      module: EeBillingModule,
      global: true,
      imports: [ConfigModule, DatabaseModule, CqrsModule],
      providers: [
        {
          provide: LIMITS_SERVICE_TOKEN,
          useClass: LimitsService,
        },
        {
          provide: PLAN_PROVIDER_TOKEN,
          useClass: HardcodedPlanProvider,
        },
        BillingCacheService,
        UsageService,
        UsageTrackingService,
        ...BILLING_CACHE_INVALIDATION_HANDLERS,
      ],
      exports: [LIMITS_SERVICE_TOKEN],
    };
  }
}
