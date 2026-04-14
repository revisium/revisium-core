export const BILLING_GRAPHQL_SERVICE_TOKEN = Symbol('BILLING_GRAPHQL_SERVICE');

export interface BillingConfigurationResult {
  enabled: boolean;
}

export interface PlanLimitsResult {
  rowVersions: number | null;
  projects: number | null;
  seats: number | null;
  storageBytes: number | null;
  apiCallsPerDay: number | null;
  rowsPerTable: number | null;
  tablesPerRevision: number | null;
  branchesPerProject: number | null;
  endpointsPerProject: number | null;
}

export interface PlanResult {
  id: string;
  name: string;
  isPublic: boolean;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  limits: PlanLimitsResult;
  features: Record<string, boolean>;
}

export interface SubscriptionResult {
  planId: string;
  status: string;
  provider: string | null;
  interval: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
}

export interface UsageMetricResult {
  current: number;
  limit: number | null;
  percentage: number | null;
}

export interface UsageSummaryResult {
  rowVersions: UsageMetricResult;
  projects: UsageMetricResult;
  seats: UsageMetricResult;
  storageBytes: UsageMetricResult;
  endpointsPerProject: UsageMetricResult;
}

export interface PaymentProviderResult {
  id: string;
  name: string;
  methods: string[];
  supportsRecurring: boolean;
}

export interface CreateCheckoutParams {
  organizationId: string;
  planId: string;
  interval?: string;
  providerId?: string;
  country?: string;
  method?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface IBillingGraphqlService {
  getBillingConfiguration(): BillingConfigurationResult;

  getPlans(): Promise<PlanResult[]>;

  getAvailableProviders(
    country?: string,
    method?: string,
  ): Promise<PaymentProviderResult[]>;

  getSubscription(organizationId: string): Promise<SubscriptionResult | null>;

  getUsage(organizationId: string): Promise<UsageSummaryResult | null>;

  getProjectEndpointUsage(
    organizationId: string,
    projectId: string,
  ): Promise<UsageMetricResult | null>;

  activateEarlyAccess(
    organizationId: string,
    planId: string,
  ): Promise<SubscriptionResult>;

  createCheckout(
    params: CreateCheckoutParams,
  ): Promise<{ checkoutUrl: string }>;

  cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<boolean>;
}
