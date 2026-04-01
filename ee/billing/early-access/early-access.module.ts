import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { AuthModule } from 'src/features/auth/auth.module';
import { MetricsModule } from 'src/infrastructure/metrics/metrics.module';
import { EarlyAccessService } from './early-access.service';
import { AutoDowngradeCronService } from './crons/auto-downgrade.cron';
import {
  BillingMutationResolver,
  BillingOrganizationResolver,
  BillingQueryResolver,
} from './graphql/billing.resolver';
import { AdminBillingController } from './rest/admin-billing.controller';
import { BillingController } from './rest/billing.controller';

const RESOLVERS = [
  BillingOrganizationResolver,
  BillingQueryResolver,
  BillingMutationResolver,
];

const CONTROLLERS = [BillingController, AdminBillingController];

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, MetricsModule],
  controllers: [...CONTROLLERS],
  providers: [EarlyAccessService, AutoDowngradeCronService, ...RESOLVERS],
  exports: [EarlyAccessService],
})
export class EarlyAccessModule {}
