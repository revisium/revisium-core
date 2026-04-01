import { Inject, Injectable } from '@nestjs/common';
import { LimitMetric } from 'src/features/billing/limits.interface';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
  PlanInfo,
  SubscriptionInfo,
} from '../billing-client.interface';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class EarlyAccessService {
  constructor(
    private readonly usageService: UsageService,
    @Inject(BILLING_CLIENT_TOKEN)
    private readonly billingClient: IBillingClient,
  ) {}

  async activateEarlyAccess(organizationId: string, planId: string) {
    return this.billingClient.activateEarlyAccess(organizationId, planId);
  }

  async getPlans(): Promise<PlanInfo[]> {
    return this.billingClient.getPlans();
  }

  async getOrgSubscription(
    organizationId: string,
  ): Promise<SubscriptionInfo | null> {
    return this.billingClient.getSubscription(organizationId);
  }

  async getOrgUsageSummary(organizationId: string) {
    const subscription =
      await this.billingClient.getSubscription(organizationId);
    const plan = subscription
      ? await this.billingClient.getPlan(subscription.planId)
      : null;

    const [rowVersions, projects, seats, storageBytes] = await Promise.all([
      this.usageService.computeUsage(organizationId, LimitMetric.ROW_VERSIONS),
      this.usageService.computeUsage(organizationId, LimitMetric.PROJECTS),
      this.usageService.computeUsage(organizationId, LimitMetric.SEATS),
      this.usageService.computeUsage(organizationId, LimitMetric.STORAGE_BYTES),
    ]);

    return {
      rowVersions: this.buildMetric(rowVersions, plan?.limits.row_versions),
      projects: this.buildMetric(projects, plan?.limits.projects),
      seats: this.buildMetric(seats, plan?.limits.seats),
      storageBytes: this.buildMetric(storageBytes, plan?.limits.storage_bytes),
    };
  }

  private buildMetric(
    current: number,
    limit: number | null = null,
  ): { current: number; limit: number | null; percentage: number | null } {
    return {
      current,
      limit,
      percentage:
        limit !== null && limit > 0
          ? Math.round((current / limit) * 10000) / 100
          : null,
    };
  }
}
