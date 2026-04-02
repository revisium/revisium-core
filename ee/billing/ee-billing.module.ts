import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { BILLING_GRAPHQL_SERVICE_TOKEN } from 'src/features/billing/billing-graphql.interface';
import { LIMITS_SERVICE_TOKEN } from 'src/features/billing/limits.interface';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { BILLING_CLIENT_TOKEN } from './billing-client.interface';
import { BillingClient } from './billing-client';
import { BillingGraphqlService } from './billing-graphql.service';
import { BILLING_CACHE_INVALIDATION_HANDLERS } from './cache/billing-cache-invalidation.handler';
import { BillingCacheService } from './cache/billing-cache.service';
import { BillingCallbackController } from './callback.controller';
import { EarlyAccessModule } from './early-access/early-access.module';
import { LimitsService } from './limits/limits.service';
import { UsageReporterService } from './usage-reporter.service';
import { UsageService } from './usage/usage.service';

@Module({})
export class EeBillingModule {
  static register(): DynamicModule {
    return {
      module: EeBillingModule,
      global: true,
      imports: [ConfigModule, DatabaseModule, CqrsModule, EarlyAccessModule],
      controllers: [BillingCallbackController],
      providers: [
        LimitsService,
        {
          provide: LIMITS_SERVICE_TOKEN,
          useExisting: LimitsService,
        },
        {
          provide: BILLING_CLIENT_TOKEN,
          useClass: BillingClient,
        },
        BillingGraphqlService,
        {
          provide: BILLING_GRAPHQL_SERVICE_TOKEN,
          useExisting: BillingGraphqlService,
        },
        BillingCacheService,
        UsageService,
        UsageReporterService,
        ...BILLING_CACHE_INVALIDATION_HANDLERS,
      ],
      exports: [
        LIMITS_SERVICE_TOKEN,
        BILLING_CLIENT_TOKEN,
        BILLING_GRAPHQL_SERVICE_TOKEN,
        BillingCacheService,
        UsageService,
      ],
    };
  }
}
