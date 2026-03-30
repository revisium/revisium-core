import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BillingCacheService } from '../cache/billing-cache.service';
import { LimitsService } from '../limits/limits.service';
import { HardcodedPlanProvider } from '../plan/hardcoded-plan-provider';
import { PLAN_PROVIDER_TOKEN } from '../plan/plan.interface';
import { UsageService } from '../usage/usage.service';

describe('LimitsService (EE)', () => {
  let module: TestingModule;
  let service: LimitsService;
  let prisma: PrismaService;
  let configValues: Record<string, string>;

  beforeAll(async () => {
    configValues = {};

    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        LimitsService,
        BillingCacheService,
        UsageService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
        { provide: PLAN_PROVIDER_TOKEN, useClass: HardcodedPlanProvider },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key] ?? undefined,
          },
        },
      ],
    }).compile();

    service = module.get(LimitsService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOrg = async () => {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    return orgId;
  };

  const createOrgWithSubscription = async (planId: string) => {
    const orgId = await createOrg();
    await prisma.subscription.create({
      data: { organizationId: orgId, planId },
    });
    return orgId;
  };

  const addProjectsToOrg = async (orgId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      await prisma.project.create({
        data: {
          id: nanoid(),
          name: `proj-${nanoid()}`,
          organizationId: orgId,
        },
      });
    }
  };

  it('should allow when standalone mode', async () => {
    configValues = { REVISIUM_STANDALONE: 'true' };
    const orgId = await createOrgWithSubscription('free');

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 1);
    expect(result.allowed).toBe(true);

    configValues = {};
  });

  it('should allow when no subscription exists', async () => {
    const orgId = await createOrg();

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 1);
    expect(result.allowed).toBe(true);
  });

  it('should allow when plan is unknown', async () => {
    const orgId = await createOrgWithSubscription('nonexistent-plan');

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 1);
    expect(result.allowed).toBe(true);
  });

  it('should allow when plan limit is unlimited (enterprise)', async () => {
    const orgId = await createOrgWithSubscription('enterprise');

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 100);
    expect(result.allowed).toBe(true);
  });

  it('should allow when under limit', async () => {
    const orgId = await createOrgWithSubscription('free');
    await addProjectsToOrg(orgId, 1);

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 1);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(3);
  });

  it('should deny when at limit', async () => {
    const orgId = await createOrgWithSubscription('free');
    await addProjectsToOrg(orgId, 3);

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 1);
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(3);
    expect(result.metric).toBe(LimitMetric.PROJECTS);
  });

  it('should deny when increment would exceed limit', async () => {
    const orgId = await createOrgWithSubscription('free');
    await addProjectsToOrg(orgId, 2);

    const result = await service.checkLimit(orgId, LimitMetric.PROJECTS, 2);
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(3);
  });

  it('should check seats against maxSeats', async () => {
    const orgId = await createOrgWithSubscription('free');
    const userId = nanoid();
    await prisma.user.create({
      data: {
        id: userId,
        password: 'hash',
        role: { connect: { id: 'systemUser' } },
      },
    });
    await prisma.userOrganization.create({
      data: {
        id: nanoid(),
        userId,
        organizationId: orgId,
        roleId: 'developer',
      },
    });

    const result = await service.checkLimit(orgId, LimitMetric.SEATS, 1);
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(1);
  });
});
