import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BillingConfigurationResult,
  CreateCheckoutParams,
  IBillingGraphqlService,
  PaymentProviderResult,
  PlanResult,
  SubscriptionResult,
  UsageMetricResult,
  UsageSummaryResult,
} from './billing-graphql.interface';

@Injectable()
export class NoopBillingGraphqlService implements IBillingGraphqlService {
  getBillingConfiguration(): BillingConfigurationResult {
    return { enabled: false };
  }

  async getPlans(): Promise<PlanResult[]> {
    return [];
  }

  async getAvailableProviders(): Promise<PaymentProviderResult[]> {
    return [];
  }

  async getSubscription(): Promise<SubscriptionResult | null> {
    return null;
  }

  async getUsage(): Promise<UsageSummaryResult | null> {
    return null;
  }

  async getProjectEndpointLimit(): Promise<number | null | undefined> {
    return undefined;
  }

  async getProjectEndpointUsage(): Promise<UsageMetricResult | null> {
    return null;
  }

  async activateEarlyAccess(): Promise<SubscriptionResult> {
    throw new BadRequestException('Billing is not enabled');
  }

  async createCheckout(
    _params: CreateCheckoutParams,
  ): Promise<{ checkoutUrl: string }> {
    throw new BadRequestException('Billing is not enabled');
  }

  async cancelSubscription(): Promise<boolean> {
    throw new BadRequestException('Billing is not enabled');
  }
}
