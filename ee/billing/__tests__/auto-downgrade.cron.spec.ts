import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { nanoid } from 'nanoid';
import { BillingStatus } from 'src/__generated__/client';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BillingCacheService } from '../cache/billing-cache.service';
import { AutoDowngradeCronService } from '../early-access/crons/auto-downgrade.cron';
import { UpdateSubscriptionStatusHandler } from '../early-access/commands/update-subscription-status.handler';

describe('AutoDowngradeCronService', () => {
  let module: TestingModule;
  let service: AutoDowngradeCronService;
  let prisma: PrismaService;
  let configValues: Record<string, string>;

  beforeAll(async () => {
    configValues = {};

    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule, ScheduleModule.forRoot()],
      providers: [
        AutoDowngradeCronService,
        UpdateSubscriptionStatusHandler,
        BillingCacheService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key] ?? undefined,
          },
        },
      ],
    }).compile();

    await module.init();
    service = module.get(AutoDowngradeCronService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOrgWithEarlyAccess = async (
    externalCustomerId?: string | null,
  ) => {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    await prisma.subscription.create({
      data: {
        organizationId: orgId,
        planId: 'pro',
        status: BillingStatus.early_adopter,
        externalCustomerId: externalCustomerId ?? null,
      },
    });
    return orgId;
  };

  it('should skip when EARLY_ACCESS_TRANSITION_DATE is not set', async () => {
    const orgId = await createOrgWithEarlyAccess();

    await service.run();

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    expect(sub!.status).toBe(BillingStatus.early_adopter);
  });

  it('should skip when transition date is in the future', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    configValues = {
      EARLY_ACCESS_TRANSITION_DATE: future.toISOString().split('T')[0],
    };

    const orgId = await createOrgWithEarlyAccess();
    await service.run();

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    expect(sub!.status).toBe(BillingStatus.early_adopter);

    configValues = {};
  });

  it('should downgrade early adopters without payment on transition date', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    configValues = {
      EARLY_ACCESS_TRANSITION_DATE: yesterday.toISOString().split('T')[0],
    };

    const orgId = await createOrgWithEarlyAccess(null);
    await service.run();

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    expect(sub!.status).toBe(BillingStatus.free);
    expect(sub!.planId).toBe('free');

    configValues = {};
  });

  it('should activate early adopters with payment on transition date', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    configValues = {
      EARLY_ACCESS_TRANSITION_DATE: yesterday.toISOString().split('T')[0],
    };

    const orgId = await createOrgWithEarlyAccess('cus_stripe_123');
    await service.run();

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    expect(sub!.status).toBe(BillingStatus.active);
    expect(sub!.planId).toBe('pro');

    configValues = {};
  });
});
