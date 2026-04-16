import { BillingStatus } from 'src/api/graphql-api/billing/models/billing-status.enum';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { BillingGraphqlService } from '../billing-graphql.service';
import { IBillingClient } from '../billing-client.interface';
import { UsageService } from '../usage/usage.service';

describe('BillingGraphqlService', () => {
  const createBillingClient = (
    overrides: Partial<IBillingClient> = {},
  ): IBillingClient => ({
    configured: true,
    getOrgLimits: jest.fn(),
    createCheckout: jest.fn(),
    cancelSubscription: jest.fn(),
    getSubscription: jest.fn(),
    getProviders: jest.fn(),
    getPortalUrl: jest.fn(),
    getPlans: jest.fn(),
    getPlan: jest.fn(),
    activateEarlyAccess: jest.fn(),
    reportUsage: jest.fn(),
    ...overrides,
  });

  const createUsageService = (
    overrides: Partial<UsageService> = {},
  ): UsageService =>
    ({
      computeUsage: jest.fn(),
      computeUsageSummary: jest.fn(),
      ...overrides,
    }) as unknown as UsageService;

  it('returns null project endpoint usage when billing is disabled', async () => {
    const billingClient = createBillingClient({ configured: false });
    const usageService = createUsageService();
    const service = new BillingGraphqlService(billingClient, usageService);

    await expect(
      service.getProjectEndpointLimit('org-1'),
    ).resolves.toBeUndefined();
    await expect(
      service.getProjectEndpointUsage('org-1', 'project-1'),
    ).resolves.toBeNull();
    expect(billingClient.getOrgLimits).not.toHaveBeenCalled();
    expect(usageService.computeUsage).not.toHaveBeenCalled();
  });

  it('builds project endpoint usage from current usage and plan limit', async () => {
    const billingClient = createBillingClient({
      getOrgLimits: jest.fn().mockResolvedValue({
        planId: 'pro',
        status: BillingStatus.active,
        limits: {
          row_versions: null,
          projects: null,
          seats: null,
          storage_bytes: null,
          api_calls_per_day: null,
          rows_per_table: null,
          tables_per_revision: null,
          branches_per_project: null,
          endpoints_per_project: 10,
        },
      }),
    });
    const usageService = createUsageService({
      computeUsage: jest.fn().mockResolvedValue(4),
    });
    const service = new BillingGraphqlService(billingClient, usageService);

    await expect(
      service.getProjectEndpointUsage('org-1', 'project-1'),
    ).resolves.toEqual({
      current: 4,
      limit: 10,
      percentage: 40,
    });
    expect(billingClient.getOrgLimits).toHaveBeenCalledWith('org-1');
    expect(usageService.computeUsage).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
      { projectId: 'project-1' },
    );
  });

  it('uses an injected endpoint limit when provided', async () => {
    const billingClient = createBillingClient();
    const usageService = createUsageService({
      computeUsage: jest.fn().mockResolvedValue(4),
    });
    const service = new BillingGraphqlService(billingClient, usageService);

    await expect(
      service.getProjectEndpointUsage('org-1', 'project-1', {
        endpointLimit: 10,
      }),
    ).resolves.toEqual({
      current: 4,
      limit: 10,
      percentage: 40,
    });
    expect(billingClient.getOrgLimits).not.toHaveBeenCalled();
  });

  it('loads the endpoint limit when the injected option is undefined', async () => {
    const billingClient = createBillingClient({
      getOrgLimits: jest.fn().mockResolvedValue({
        planId: 'pro',
        status: BillingStatus.active,
        limits: {
          row_versions: null,
          projects: null,
          seats: null,
          storage_bytes: null,
          api_calls_per_day: null,
          rows_per_table: null,
          tables_per_revision: null,
          branches_per_project: null,
          endpoints_per_project: 12,
        },
      }),
    });
    const usageService = createUsageService({
      computeUsage: jest.fn().mockResolvedValue(6),
    });
    const service = new BillingGraphqlService(billingClient, usageService);

    await expect(
      service.getProjectEndpointUsage('org-1', 'project-1', {
        endpointLimit: undefined,
      }),
    ).resolves.toEqual({
      current: 6,
      limit: 12,
      percentage: 50,
    });
    expect(billingClient.getOrgLimits).toHaveBeenCalledWith('org-1');
  });
});
