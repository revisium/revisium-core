import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BillingStatus } from 'src/api/graphql-api/billing/models/billing-status.enum';
import {
  BillingConfigurationResult,
  CreateCheckoutParams,
  IBillingGraphqlService,
  PaymentProviderResult,
  PlanResult,
  SubscriptionResult,
  UsageMetricResult,
  UsageSummaryResult,
} from 'src/features/billing/billing-graphql.interface';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { buildMetric } from './usage/build-metric';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
} from './billing-client.interface';
import { UsageService } from './usage/usage.service';

const VALID_BILLING_STATUSES = new Set<string>(Object.values(BillingStatus));
const VALID_INTERVALS = new Set(['monthly', 'yearly']);
const ORG_LIMITS_CACHE_TTL_MS = 60_000;

@Injectable()
export class BillingGraphqlService implements IBillingGraphqlService {
  private readonly orgLimitsCache = new Map<
    string,
    {
      data?: Awaited<ReturnType<IBillingClient['getOrgLimits']>>;
      expiresAt: number;
      promise?: Promise<Awaited<ReturnType<IBillingClient['getOrgLimits']>>>;
    }
  >();

  constructor(
    @Inject(BILLING_CLIENT_TOKEN)
    private readonly billingClient: IBillingClient,
    private readonly usageService: UsageService,
  ) {}

  getBillingConfiguration(): BillingConfigurationResult {
    return { enabled: this.billingClient.configured };
  }

  async getPlans(): Promise<PlanResult[]> {
    if (!this.billingClient.configured) return [];
    const plans = await this.billingClient.getPlans();
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      isPublic: p.isPublic,
      monthlyPriceUsd: p.monthlyPriceUsd,
      yearlyPriceUsd: p.yearlyPriceUsd,
      limits: {
        rowVersions: p.limits.row_versions,
        projects: p.limits.projects,
        seats: p.limits.seats,
        storageBytes: p.limits.storage_bytes,
        apiCallsPerDay: p.limits.api_calls_per_day,
        rowsPerTable: p.limits.rows_per_table,
        tablesPerRevision: p.limits.tables_per_revision,
        branchesPerProject: p.limits.branches_per_project,
        endpointsPerProject: p.limits.endpoints_per_project,
      },
      features: p.features ?? {},
    }));
  }

  async getAvailableProviders(
    country?: string,
    method?: string,
  ): Promise<PaymentProviderResult[]> {
    if (!this.billingClient.configured) return [];
    return this.billingClient.getProviders({ country, method });
  }

  async getSubscription(
    organizationId: string,
  ): Promise<SubscriptionResult | null> {
    if (!this.billingClient.configured) return null;
    const sub = await this.billingClient.getSubscription(organizationId);
    if (!sub) return null;
    return {
      planId: sub.planId,
      status: this.normalizeStatus(sub.status),
      provider: sub.provider,
      interval: sub.interval,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAt: sub.cancelAt,
    };
  }

  async getUsage(organizationId: string): Promise<UsageSummaryResult | null> {
    if (!this.billingClient.configured) return null;
    const orgLimits =
      await this.billingClient.getOrgLimits(organizationId);

    return this.usageService.computeUsageSummary(
      organizationId,
      orgLimits.limits,
    );
  }

  async getProjectEndpointUsage(
    organizationId: string,
    projectId: string,
  ): Promise<UsageMetricResult | null> {
    if (!this.billingClient.configured) {
      return null;
    }

    const orgLimits = await this.getOrgLimitsCached(organizationId);
    const current = await this.usageService.computeUsage(
      organizationId,
      LimitMetric.ENDPOINTS_PER_PROJECT,
      { projectId },
    );

    return buildMetric(current, orgLimits.limits.endpoints_per_project);
  }

  async activateEarlyAccess(
    organizationId: string,
    planId: string,
  ): Promise<SubscriptionResult> {
    if (!this.billingClient.configured) {
      throw new BadRequestException('Billing is not enabled');
    }
    const result = await this.billingClient.activateEarlyAccess(
      organizationId,
      planId,
    );
    return {
      planId: result.planId,
      status: this.normalizeStatus(result.status),
      provider: null,
      interval: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
    };
  }

  async createCheckout(
    params: CreateCheckoutParams,
  ): Promise<{ checkoutUrl: string }> {
    if (!this.billingClient.configured) {
      throw new BadRequestException('Billing is not enabled');
    }
    if (params.interval && !VALID_INTERVALS.has(params.interval)) {
      throw new BadRequestException('interval must be monthly or yearly');
    }
    this.validateRedirectUrl(params.successUrl, 'successUrl');
    this.validateRedirectUrl(params.cancelUrl, 'cancelUrl');

    return this.billingClient.createCheckout({
      ...params,
      interval: params.interval as 'monthly' | 'yearly' | undefined,
    });
  }

  async cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<boolean> {
    if (!this.billingClient.configured) {
      throw new BadRequestException('Billing is not enabled');
    }
    await this.billingClient.cancelSubscription(
      organizationId,
      cancelAtPeriodEnd,
    );
    return true;
  }

  private normalizeStatus(status: string): string {
    if (VALID_BILLING_STATUSES.has(status)) return status;
    return BillingStatus.free;
  }

  private validateRedirectUrl(url: string, field: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('invalid protocol');
      }
    } catch {
      throw new BadRequestException(`${field} must be a valid HTTP(S) URL`);
    }
  }

  private async getOrgLimitsCached(organizationId: string) {
    const cached = this.orgLimitsCache.get(organizationId);
    if (cached?.data && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    if (cached?.promise) {
      return cached.promise;
    }

    const promise = this.billingClient
      .getOrgLimits(organizationId)
      .then((data) => {
        this.orgLimitsCache.set(organizationId, {
          data,
          expiresAt: Date.now() + ORG_LIMITS_CACHE_TTL_MS,
        });
        return data;
      })
      .catch((error) => {
        this.orgLimitsCache.delete(organizationId);
        throw error;
      });

    this.orgLimitsCache.set(organizationId, {
      expiresAt: 0,
      promise,
    });

    return promise;
  }

}
