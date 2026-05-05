import { Test, TestingModule } from '@nestjs/testing';
import { BillingCheckService } from '../billing-check.service';
import {
  ILimitsService,
  LIMITS_SERVICE_TOKEN,
  LimitMetric,
} from 'src/features/billing/limits.interface';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CoreModule } from 'src/core/core.module';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
  OrgLimits,
} from 'ee/billing/billing-client.interface';
import { LimitsService } from 'ee/billing/limits/limits.service';
import { NoopLimitsService } from 'src/features/billing/noop-limits.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';

describe('BillingCheckService', () => {
  let service: BillingCheckService;
  let prisma: {
    revision: {
      findUniqueOrThrow: jest.Mock;
    };
  };
  let transactionService: { getTransactionOrPrisma: jest.Mock };
  let limitsService: jest.Mocked<ILimitsService>;

  beforeEach(async () => {
    prisma = {
      revision: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          branch: {
            project: {
              id: 'project-1',
              organizationId: 'org-1',
            },
          },
        }),
      },
    };
    limitsService = {
      checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
    };
    transactionService = {
      getTransactionOrPrisma: jest.fn().mockReturnValue(prisma),
    };

    const module = await Test.createTestingModule({
      providers: [
        BillingCheckService,
        { provide: TransactionPrismaService, useValue: transactionService },
        { provide: LIMITS_SERVICE_TOKEN, useValue: limitsService },
      ],
    }).compile();

    service = module.get(BillingCheckService);
  });

  it('adds resolved project context for endpoints-per-project checks', async () => {
    await service.check('revision-1', LimitMetric.ENDPOINTS_PER_PROJECT, 1);

    expect(prisma.revision.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'revision-1' },
      select: {
        branch: {
          select: {
            project: {
              select: { id: true, organizationId: true },
            },
          },
        },
      },
    });
    expect(limitsService.checkLimit).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
      1,
      {
        revisionId: 'revision-1',
        projectId: 'project-1',
      },
    );
  });

  it('passes through explicit context while preserving resolved project id', async () => {
    await service.check('revision-1', LimitMetric.ENDPOINTS_PER_PROJECT, 2, {
      tableId: 'table-1',
      projectId: 'user-project',
    });

    expect(limitsService.checkLimit).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
      2,
      {
        revisionId: 'revision-1',
        projectId: 'project-1',
        tableId: 'table-1',
      },
    );
  });

  it('does not inject project context for org-scoped metrics', async () => {
    await service.check('revision-1', LimitMetric.PROJECTS);

    expect(limitsService.checkLimit).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.PROJECTS,
      undefined,
      undefined,
    );
  });

  it('throws LimitExceededException when the limit service denies the action', async () => {
    limitsService.checkLimit.mockResolvedValueOnce({
      allowed: false,
      metric: LimitMetric.ENDPOINTS_PER_PROJECT,
      current: 2,
      limit: 2,
    });

    await expect(
      service.check('revision-1', LimitMetric.ENDPOINTS_PER_PROJECT),
    ).rejects.toBeInstanceOf(LimitExceededException);
  });
});

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
    endpoints_per_project: 2,
  },
};

// Regression test for the SharedModule DI scoping bug. Before the fix,
// SharedModule explicitly imported BillingModule (which binds
// LIMITS_SERVICE_TOKEN to NoopLimitsService), shadowing the @Global
// EeBillingModule binding to the real LimitsService. As a result,
// BillingCheckService received the no-op stub and silently allowed
// every check, while CreateProjectHandler (which does not transit
// SharedModule) correctly resolved the global EE binding. This test
// builds the full app context and verifies BillingCheckService now
// reaches the real LimitsService and throws on over-limit usage.
describe('BillingCheckService DI resolution (with EeBillingModule)', () => {
  let module: TestingModule;
  let service: BillingCheckService;
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
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(BILLING_CLIENT_TOKEN)
      .useValue(mockBillingClient)
      .overrideProvider(CACHE_SERVICE)
      .useClass(NoopCacheService)
      .compile();

    service = module.get(BillingCheckService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('resolves LIMITS_SERVICE_TOKEN to the real EE LimitsService, not NoopLimitsService', () => {
    const limits = module.get<ILimitsService>(LIMITS_SERVICE_TOKEN);
    expect(limits).toBeInstanceOf(LimitsService);
    expect(limits).not.toBeInstanceOf(NoopLimitsService);
  });

  it('throws LimitExceededException when the EE LimitsService denies an over-limit branch creation', async () => {
    const orgId = `bc-di-${Date.now()}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: orgId },
    });
    const projectId = `proj-${orgId}`;
    await prisma.project.create({
      data: { id: projectId, name: 'p1', organizationId: orgId },
    });
    // Free plan caps branches_per_project at 3 — seed 3 to put the org at the cap.
    let revisionId = '';
    for (let i = 0; i < 3; i++) {
      const branchId = `branch-${orgId}-${i}`;
      await prisma.branch.create({
        data: { id: branchId, name: `b${i}`, projectId, isRoot: i === 0 },
      });
      const rev = await prisma.revision.create({
        data: {
          id: `rev-${orgId}-${i}`,
          branchId,
          isDraft: i === 0,
        },
      });
      if (i === 0) revisionId = rev.id;
    }
    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);

    await expect(
      service.check(revisionId, LimitMetric.BRANCHES_PER_PROJECT, 1),
    ).rejects.toBeInstanceOf(LimitExceededException);
  });
});
