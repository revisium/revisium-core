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
    rows_per_table: 10_000,
    tables_per_revision: 100,
    branches_per_project: 20,
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
    rows_per_table: 1_000,
    tables_per_revision: 10,
    branches_per_project: 3,
  },
};

describe('LimitsService (Ultra-Thin)', () => {
  let module: TestingModule;
  let service: LimitsService;
  let prisma: PrismaService;
  let billingCache: BillingCacheService;
  let usageService: UsageService;
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
    billingCache = module.get(BillingCacheService);
    usageService = module.get(UsageService);
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
        rows_per_table: null,
        tables_per_revision: null,
        branches_per_project: null,
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

  it('should deny when rows_per_table limit reached', async () => {
    const orgId = `limits-rows-${Date.now()}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: orgId },
    });
    const projectId = `proj-${orgId}`;
    await prisma.project.create({
      data: { id: projectId, name: 'p1', organizationId: orgId },
    });
    const branchId = `branch-${orgId}`;
    await prisma.branch.create({
      data: { id: branchId, name: 'master', projectId, isRoot: true },
    });
    const revisionId = `rev-${orgId}`;
    await prisma.revision.create({
      data: { id: revisionId, branchId, isDraft: true },
    });
    const tableVersionId = `table-ver-${orgId}`;
    await prisma.table.create({
      data: {
        versionId: tableVersionId,
        createdId: tableVersionId,
        id: 'test-table',
        revisions: { connect: { id: revisionId } },
      },
    });
    const rowData = Array.from({ length: 1000 }, (_, i) => ({
      versionId: `row-${orgId}-${i}`,
      createdId: `row-${orgId}-${i}`,
      id: `r${i}`,
      data: {},
      hash: 'h',
      schemaHash: 'sh',
    }));
    await prisma.row.createMany({ data: rowData });
    // A = Row.versionId, B = Table.versionId (alphabetical: Row < Table)
    await prisma.$executeRaw`
      INSERT INTO "_RowToTable" ("A", "B")
      SELECT "versionId", ${tableVersionId} FROM "Row" WHERE "versionId" LIKE ${`row-${orgId}-%`}
    `;

    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);

    const result = await service.checkLimit(
      orgId,
      LimitMetric.ROWS_PER_TABLE,
      1,
      { revisionId, tableId: 'test-table' },
    );

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(1000);
    expect(result.limit).toBe(1_000);
    expect(result.metric).toBe(LimitMetric.ROWS_PER_TABLE);
  });

  it('should allow tables_per_revision when under limit', async () => {
    const orgId = `limits-tables-${Date.now()}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: orgId },
    });
    const projectId = `proj-${orgId}`;
    await prisma.project.create({
      data: { id: projectId, name: 'p1', organizationId: orgId },
    });
    const branchId = `branch-${orgId}`;
    await prisma.branch.create({
      data: { id: branchId, name: 'master', projectId, isRoot: true },
    });
    const revisionId = `rev-${orgId}`;
    await prisma.revision.create({
      data: { id: revisionId, branchId, isDraft: true },
    });
    for (let i = 0; i < 2; i++) {
      await prisma.table.create({
        data: {
          versionId: `tv-${orgId}-${i}`,
          createdId: `tv-${orgId}-${i}`,
          id: `t${i}`,
          revisions: { connect: { id: revisionId } },
        },
      });
    }

    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);

    const result = await service.checkLimit(
      orgId,
      LimitMetric.TABLES_PER_REVISION,
      1,
      { projectId },
    );

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(10);
  });

  it('should bypass cache for PROJECTS metric', async () => {
    const computeSpy = jest.spyOn(usageService, 'computeUsage');
    const cacheSpy = jest.spyOn(billingCache, 'usage');
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);

    await service.checkLimit('test-org', LimitMetric.PROJECTS, 1);

    expect(computeSpy).toHaveBeenCalledWith('test-org', LimitMetric.PROJECTS, undefined);
    expect(cacheSpy).not.toHaveBeenCalled();
  });

  it('should bypass cache for SEATS metric', async () => {
    const computeSpy = jest.spyOn(usageService, 'computeUsage');
    const cacheSpy = jest.spyOn(billingCache, 'usage');
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);

    await service.checkLimit('test-org', LimitMetric.SEATS, 1);

    expect(computeSpy).toHaveBeenCalledWith('test-org', LimitMetric.SEATS, undefined);
    expect(cacheSpy).not.toHaveBeenCalled();
  });

  it('should use cache for ROW_VERSIONS metric', async () => {
    const cacheSpy = jest.spyOn(billingCache, 'usage');
    mockBillingClient.getOrgLimits.mockResolvedValue(PRO_LIMITS);

    await service.checkLimit('test-org', LimitMetric.ROW_VERSIONS, 1);

    expect(cacheSpy).toHaveBeenCalled();
  });

  it('should deny when branches_per_project limit reached', async () => {
    const orgId = `limits-branches-${Date.now()}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: orgId },
    });
    const projectId = `proj-${orgId}`;
    await prisma.project.create({
      data: { id: projectId, name: 'p1', organizationId: orgId },
    });
    for (let i = 0; i < 3; i++) {
      const branchId = `branch-${orgId}-${i}`;
      await prisma.branch.create({
        data: { id: branchId, name: `b${i}`, projectId, isRoot: i === 0 },
      });
    }

    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);

    const result = await service.checkLimit(
      orgId,
      LimitMetric.BRANCHES_PER_PROJECT,
      1,
      { projectId },
    );

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(3);
    expect(result.metric).toBe(LimitMetric.BRANCHES_PER_PROJECT);
  });
});
