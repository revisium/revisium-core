import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/features/auth/auth.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { MetricsModule } from 'src/infrastructure/metrics/metrics.module';
import { ActivateEarlyAccessHandler } from './commands/activate-early-access.handler';
import { UpdateSubscriptionStatusHandler } from './commands/update-subscription-status.handler';
import { AutoDowngradeCronService } from './crons/auto-downgrade.cron';
import { EarlyAccessService } from './early-access.service';
import {
  BillingMutationResolver,
  BillingOrganizationResolver,
  BillingQueryResolver,
} from './graphql/billing.resolver';
import { AdminBillingController } from './rest/admin-billing.controller';
import { BillingController } from './rest/billing.controller';

const COMMAND_HANDLERS = [
  ActivateEarlyAccessHandler,
  UpdateSubscriptionStatusHandler,
];

const RESOLVERS = [
  BillingOrganizationResolver,
  BillingQueryResolver,
  BillingMutationResolver,
];

const CONTROLLERS = [BillingController, AdminBillingController];

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CqrsModule,
    AuthModule,
    MetricsModule,
  ],
  controllers: [...CONTROLLERS],
  providers: [
    EarlyAccessService,
    AutoDowngradeCronService,
    ...COMMAND_HANDLERS,
    ...RESOLVERS,
  ],
  exports: [EarlyAccessService],
})
export class EarlyAccessModule {}
