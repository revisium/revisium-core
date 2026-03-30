import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILimitsService,
  LimitCheckResult,
  LimitMetric,
} from 'src/features/billing/limits.interface';
import { BillingCacheService } from '../cache/billing-cache.service';
import {
  IPlanProvider,
  Plan,
  PLAN_PROVIDER_TOKEN,
} from '../plan/plan.interface';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class LimitsService implements ILimitsService {
  private readonly logger = new Logger(LimitsService.name);

  constructor(
    private readonly billingCache: BillingCacheService,
    private readonly usageService: UsageService,
    @Inject(PLAN_PROVIDER_TOKEN)
    private readonly planProvider: IPlanProvider,
    private readonly configService: ConfigService,
  ) {}

  async checkLimit(
    organizationId: string,
    metric: LimitMetric,
    increment: number = 1,
  ): Promise<LimitCheckResult> {
    if (this.configService.get('REVISIUM_STANDALONE') === 'true') {
      return { allowed: true };
    }

    const subscription = await this.billingCache.subscription(
      organizationId,
      () => this.usageService.findSubscription(organizationId),
    );

    if (!subscription) {
      return { allowed: true };
    }

    const plan = await this.planProvider.getPlan(subscription.planId);
    if (!plan) {
      return { allowed: true };
    }

    const limit = this.getLimitForMetric(plan, metric);
    if (limit === null) {
      return { allowed: true };
    }

    const current = await this.billingCache.usage(organizationId, metric, () =>
      this.usageService.computeUsage(organizationId, metric),
    );
    const projected = current + increment;

    if (projected > limit) {
      this.logger.debug(
        `Limit exceeded: org=${organizationId}, metric=${metric}, current=${current}, limit=${limit}, increment=${increment}`,
      );
      return { allowed: false, current, limit, metric };
    }

    return { allowed: true, current, limit };
  }

  private getLimitForMetric(plan: Plan, metric: LimitMetric): number | null {
    switch (metric) {
      case LimitMetric.ROW_VERSIONS:
        return plan.maxRowVersions;
      case LimitMetric.PROJECTS:
        return plan.maxProjects;
      case LimitMetric.SEATS:
        return plan.maxSeats;
      case LimitMetric.STORAGE_BYTES:
        return plan.maxStorageBytes;
      case LimitMetric.API_CALLS:
        return plan.maxApiCallsPerDay;
      default:
        return null;
    }
  }
}
