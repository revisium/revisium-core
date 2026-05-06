import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { CoreModule } from 'src/core/core.module';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { CreateProjectHandler } from 'src/features/project/commands/handlers/create-project.handler';
import { CreateProjectCommand } from 'src/features/project/commands/impl';
import { SYSTEM_TABLE_PREFIX } from 'src/features/share/system-tables.consts';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
  OrgLimits,
} from '../billing-client.interface';

const TABLE_CAP = 5;

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
    tables_per_revision: TABLE_CAP,
    branches_per_project: 3,
    endpoints_per_project: 2,
  },
};

describe('resource-level limit enforcement', () => {
  let module: TestingModule;
  let billingCheck: BillingCheckService;
  let createProjectHandler: CreateProjectHandler;
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

    billingCheck = module.get(BillingCheckService);
    createProjectHandler = module.get(CreateProjectHandler);
    prisma = module.get(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBillingClient.getOrgLimits.mockResolvedValue(FREE_LIMITS);
  });

  afterAll(async () => {
    await module.close();
  });

  it('rejects the next table when the master draft revision is at the cap', async () => {
    const { masterDraftId } = await createProjectWithDrafts({
      masterTableCount: TABLE_CAP,
      branchTableCount: 0,
    });

    await expect(checkTableCreate(masterDraftId)).rejects.toBeInstanceOf(
      LimitExceededException,
    );
  });

  it('rejects the next table when a non-master draft revision is at the cap', async () => {
    const { branchDraftId } = await createProjectWithDrafts({
      masterTableCount: 0,
      branchTableCount: TABLE_CAP,
    });

    await expect(checkTableCreate(branchDraftId)).rejects.toBeInstanceOf(
      LimitExceededException,
    );
  });

  it('keeps the master and non-master draft revision counters independent', async () => {
    const { masterDraftId, branchDraftId } = await createProjectWithDrafts({
      masterTableCount: TABLE_CAP,
      branchTableCount: 0,
    });

    await expect(checkTableCreate(masterDraftId)).rejects.toBeInstanceOf(
      LimitExceededException,
    );

    for (let i = 0; i < TABLE_CAP; i++) {
      await expect(checkTableCreate(branchDraftId)).resolves.toBeUndefined();
      await createTableInRevision(branchDraftId, `branch-created-${i}`);
    }

    await expect(checkTableCreate(branchDraftId)).rejects.toBeInstanceOf(
      LimitExceededException,
    );
  });

  it('allows 5 user tables on a fresh project before rejecting the 6th', async () => {
    const { masterDraftId } = await createFreshProjectWithMasterDraft();

    const systemTableCount = await prisma.table.count({
      where: {
        revisions: { some: { id: masterDraftId } },
        id: { startsWith: SYSTEM_TABLE_PREFIX },
      },
    });
    expect(systemTableCount).toBeGreaterThan(0);

    for (let i = 1; i <= TABLE_CAP; i++) {
      await expect(
        createUserTable(masterDraftId, `user-table-${i}-${nanoid()}`),
      ).resolves.toBeUndefined();
    }

    let error: unknown;
    try {
      await createUserTable(masterDraftId, `user-table-6-${nanoid()}`);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(LimitExceededException);
    expect((error as LimitExceededException).getResponse()).toMatchObject({
      metric: LimitMetric.TABLES_PER_REVISION,
      limit: TABLE_CAP,
      current: TABLE_CAP,
    });
  });

  async function checkTableCreate(revisionId: string) {
    await billingCheck.check(
      revisionId,
      LimitMetric.TABLES_PER_REVISION,
      1,
    );
  }

  async function createProjectWithDrafts({
    masterTableCount,
    branchTableCount,
  }: {
    masterTableCount: number;
    branchTableCount: number;
  }) {
    const orgId = nanoid();
    const projectId = nanoid();
    const masterBranchId = nanoid();
    const branchId = nanoid();
    const masterDraftId = nanoid();
    const branchDraftId = nanoid();

    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    await prisma.project.create({
      data: {
        id: projectId,
        name: `project-${projectId}`,
        organizationId: orgId,
      },
    });
    await prisma.branch.create({
      data: {
        id: masterBranchId,
        name: 'master',
        projectId,
        isRoot: true,
      },
    });
    await prisma.branch.create({
      data: {
        id: branchId,
        name: `branch-${branchId}`,
        projectId,
      },
    });
    await prisma.revision.create({
      data: {
        id: masterDraftId,
        branchId: masterBranchId,
        isDraft: true,
      },
    });
    await prisma.revision.create({
      data: {
        id: branchDraftId,
        branchId,
        isDraft: true,
      },
    });

    await createTablesInRevision(masterDraftId, masterTableCount, 'master');
    await createTablesInRevision(branchDraftId, branchTableCount, 'branch');

    return { masterDraftId, branchDraftId };
  }

  async function createFreshProjectWithMasterDraft() {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });

    const projectId = await createProjectHandler.execute(
      new CreateProjectCommand({
        organizationId: orgId,
        projectName: `project-${nanoid()}`,
      }),
    );

    const masterDraft = await prisma.revision.findFirstOrThrow({
      where: {
        isDraft: true,
        branch: {
          projectId,
          isRoot: true,
        },
      },
      select: { id: true },
    });

    return { masterDraftId: masterDraft.id };
  }

  async function createUserTable(revisionId: string, tableId: string) {
    await checkTableCreate(revisionId);
    await createTableInRevision(revisionId, tableId);
  }

  async function createTablesInRevision(
    revisionId: string,
    count: number,
    prefix: string,
  ) {
    for (let i = 0; i < count; i++) {
      await createTableInRevision(revisionId, `${prefix}-${i}`);
    }
  }

  async function createTableInRevision(revisionId: string, tableId: string) {
    const tableVersionId = nanoid();
    await prisma.table.create({
      data: {
        versionId: tableVersionId,
        createdId: nanoid(),
        id: `${tableId}-${nanoid()}`,
        revisions: { connect: { id: revisionId } },
      },
    });
  }
});
