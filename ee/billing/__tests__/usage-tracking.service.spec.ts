import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { nanoid } from 'nanoid';
import { BillingStatus } from 'src/__generated__/client';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UsageTrackingService } from '../usage/usage-tracking.service';
import { UsageService } from '../usage/usage.service';

describe('UsageTrackingService', () => {
  let module: TestingModule;
  let service: UsageTrackingService;
  let prisma: PrismaService;
  let configValues: Record<string, string>;

  beforeAll(async () => {
    configValues = {};

    module = await Test.createTestingModule({
      imports: [DatabaseModule, ScheduleModule.forRoot()],
      providers: [
        UsageTrackingService,
        UsageService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key] ?? undefined,
          },
        },
      ],
    }).compile();

    service = module.get(UsageTrackingService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOrgWithSubscription = async (status: BillingStatus) => {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    const sub = await prisma.subscription.create({
      data: { organizationId: orgId, planId: 'free', status },
    });
    return { orgId, subscriptionId: sub.id };
  };

  it('should skip when standalone mode', async () => {
    configValues = { REVISIUM_STANDALONE: 'true' };
    const { subscriptionId } = await createOrgWithSubscription(
      BillingStatus.active,
    );

    await service.snapshotUsage();

    // No usage records created even though an active subscription exists
    const records = await prisma.usageRecord.findMany({
      where: { subscriptionId },
    });
    expect(records).toHaveLength(0);

    configValues = {};
  });

  it('should create usage records for active subscriptions', async () => {
    const { subscriptionId } = await createOrgWithSubscription(
      BillingStatus.active,
    );

    await service.snapshotUsage();

    const records = await prisma.usageRecord.findMany({
      where: { subscriptionId },
    });

    const metrics = Object.values(LimitMetric);
    expect(records).toHaveLength(metrics.length);
    expect(records.map((r) => r.metric).sort()).toEqual([...metrics].sort());
  });

  it('should create usage records for early_adopter subscriptions', async () => {
    const { subscriptionId } = await createOrgWithSubscription(
      BillingStatus.early_adopter,
    );

    await service.snapshotUsage();

    const records = await prisma.usageRecord.findMany({
      where: { subscriptionId },
    });
    expect(records.length).toBeGreaterThan(0);
  });

  it('should NOT create usage records for free subscriptions', async () => {
    const { subscriptionId } = await createOrgWithSubscription(
      BillingStatus.free,
    );

    await service.snapshotUsage();

    const records = await prisma.usageRecord.findMany({
      where: { subscriptionId },
    });
    expect(records).toHaveLength(0);
  });

  it('should use yesterday as period', async () => {
    const { subscriptionId } = await createOrgWithSubscription(
      BillingStatus.active,
    );

    await service.snapshotUsage();

    const record = await prisma.usageRecord.findFirst({
      where: { subscriptionId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(record!.periodStart.getTime()).toBeLessThan(today.getTime());
  });

  it('should be idempotent (upsert on re-run)', async () => {
    const { subscriptionId } = await createOrgWithSubscription(
      BillingStatus.active,
    );

    await service.snapshotUsage();
    await service.snapshotUsage();

    const records = await prisma.usageRecord.findMany({
      where: { subscriptionId },
    });

    const metrics = Object.values(LimitMetric);
    expect(records).toHaveLength(metrics.length);
  });
});
