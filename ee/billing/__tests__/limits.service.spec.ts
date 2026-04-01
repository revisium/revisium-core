import { Test, TestingModule } from '@nestjs/testing';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
  OrgLimits,
} from '../billing-client.interface';
import { BillingCacheService } from '../cache/billing-cache.service';
import { LimitsService } from '../limits/limits.service';
import { UsageService } from '../usage/usage.service';

const PRO_LIMITS: OrgLimits = {
  planId: 'pro',
  status: 'active',
  limits: {
    row_versions: 500_000,
    projects: 20,
    seats: 10,
    storage_bytes: 10_000_000_000,
    api_calls_per_day: 50_000,
  },
};

const FREE_LIMITS: OrgLimits = {
  planId: 'free',
  status: 'free',
  limits: {
    row_versions: 10_000,
    projects: 3,
    seats: 1,
    storage_bytes: 500_000_000,
    api_calls_per_day: 1_000,
  },
};

describe('LimitsService (Ultra-Thin)', () => {
  let module: TestingModule;
  let service: LimitsService;
  let prisma: PrismaService;
  let mockBillingClient: jest.Mocked<IBillingClient>;

  beforeAll(async () => {
    mockBillingClient = {
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
    };

    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        LimitsService,
        BillingCacheService,
        UsageService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
        { provide: BILLING_CLIENT_TOKEN, useValue: mockBillingClient },
      ],
    }).compile();

    service = module.get(LimitsService);
    prisma = module.get(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.invalidateCache('test-org');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow when under limit (pro plan)', async () => {
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);

    const result = await service.checkLimit(
      'test-org',
      LimitMetric.PROJECTS,
      1,
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(20);
    expect(mockBillingClient.getOrgLimits).toHaveBeenCalledWith('test-org');
  });

  it('should deny when at free plan project limit', async () => {
    const orgId = `limits-free-${Date.now()}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: orgId },
    });
    for (let i = 0; i < 3; i++) {
      await prisma.project.create({
        data: {
          id: `proj-${orgId}-${i}`,
          name: `p${i}`,
          organizationId: orgId,
        },
      });
    }
    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 1);

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(3);
    expect(result.metric).toBe(LimitMetric.PROJECTS);
  });

  it('should allow unlimited (null limit)', async () => {
    const unlimited: OrgLimits = {
      planId: 'enterprise',
      status: 'active',
      limits: {
        row_versions: null,
        projects: null,
        seats: null,
        storage_bytes: null,
        api_calls_per_day: null,
      },
    };
    mockBillingClient.getOrgLimits.mockResolvedValue(unlimited);

    const result = await service.checkLimit(
      'test-org',
      LimitMetric.PROJECTS,
      100,
    );

    expect(result.allowed).toBe(true);
  });

  it('should fail-open when billing client throws', async () => {
    mockBillingClient.getOrgLimits.mockRejectedValue(
      new Error('Network error'),
    );

    const result = await service.checkLimit(
      'test-org',
      LimitMetric.PROJECTS,
      1,
    );

    expect(result.allowed).toBe(true);
  });

  it('should use cached limits on second call', async () => {
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);

    await service.checkLimit('cached-org', LimitMetric.PROJECTS, 1);
    await service.checkLimit('cached-org', LimitMetric.PROJECTS, 1);

    expect(mockBillingClient.getOrgLimits).toHaveBeenCalledTimes(1);
  });

  it('should use stale cache on billing client failure', async () => {
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);
    await service.checkLimit('stale-org', LimitMetric.PROJECTS, 1);

    service.invalidateCache('stale-org');
    mockBillingClient.getOrgLimits.mockRejectedValue(new Error('Down'));

    const result = await service.checkLimit(
      'stale-org',
      LimitMetric.PROJECTS,
      1,
    );

    expect(result.allowed).toBe(true);
  });

  it('should refetch after invalidateCache', async () => {
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);
    await service.checkLimit('inv-org', LimitMetric.PROJECTS, 1);

    service.invalidateCache('inv-org');
    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);

    const result = await service.checkLimit('inv-org', LimitMetric.PROJECTS, 1);

    expect(result.limit).toBe(3);
    expect(mockBillingClient.getOrgLimits).toHaveBeenCalledTimes(2);
  });
});
