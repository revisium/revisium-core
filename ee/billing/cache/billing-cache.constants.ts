export const BILLING_CACHE_KEYS = {
  SUBSCRIPTION: (organizationId: string) => `billing:sub:${organizationId}`,

  USAGE: (organizationId: string, metric: string) =>
    `billing:usage:${organizationId}:${metric}`,

  REVISION_ORG: (revisionId: string) => `billing:rev-org:${revisionId}`,
} as const;

export const BILLING_CACHE_TAGS = {
  ORG_BILLING: (organizationId: string) => `billing-org-${organizationId}`,

  ORG_USAGE: (organizationId: string) => `billing-usage-${organizationId}`,
} as const;

export const BILLING_CACHE_CONFIG = {
  SUBSCRIPTION_TTL: '5m' as const,
  USAGE_TTL: '2m' as const,
  REVISION_ORG_TTL: '1d' as const,
} as const;
