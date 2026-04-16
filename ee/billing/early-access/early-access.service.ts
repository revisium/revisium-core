import { Inject, Injectable } from '@nestjs/common';
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

    return this.usageService.computeUsageSummary(organizationId, plan?.limits);
  }
}
