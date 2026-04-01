export const BILLING_CLIENT_TOKEN = Symbol('BILLING_CLIENT');

export interface OrgLimits {
  planId: string;
  status: string;
  limits: {
    row_versions: number | null;
    projects: number | null;
    seats: number | null;
    storage_bytes: number | null;
    api_calls_per_day: number | null;
  };
}

export interface SubscriptionInfo {
  planId: string;
  status: string;
  provider: string | null;
  interval: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
}

export interface PlanInfo {
  id: string;
  name: string;
  isPublic: boolean;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  limits: OrgLimits['limits'];
  features: Record<string, boolean>;
}

export interface CreateCheckoutParams {
  organizationId: string;
  planId: string;
  interval?: 'monthly' | 'yearly';
  providerId?: string;
  country?: string;
  method?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  methods: string[];
  supportsRecurring: boolean;
}

export interface UsageReport {
  row_versions: number;
  projects: number;
  seats: number;
  storage_bytes: number;
}

export interface IBillingClient {
  getOrgLimits(organizationId: string): Promise<OrgLimits>;
  createCheckout(
    params: CreateCheckoutParams,
  ): Promise<{ checkoutUrl: string }>;
  cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<void>;
  getSubscription(organizationId: string): Promise<SubscriptionInfo | null>;
  getProviders(params: {
    country?: string;
    method?: string;
  }): Promise<ProviderInfo[]>;
  getPortalUrl(
    organizationId: string,
    returnUrl: string,
  ): Promise<{ url: string | null }>;
  getPlans(): Promise<PlanInfo[]>;
  getPlan(planId: string): Promise<PlanInfo | null>;
  activateEarlyAccess(
    organizationId: string,
    planId: string,
  ): Promise<{ status: string; planId: string }>;
  reportUsage(organizationId: string, usage: UsageReport): Promise<void>;
}
