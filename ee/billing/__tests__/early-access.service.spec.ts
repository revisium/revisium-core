import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { BillingStatus } from 'src/__generated__/client';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BillingCacheService } from '../cache/billing-cache.service';
import { EarlyAccessService } from '../early-access/early-access.service';
import { ActivateEarlyAccessHandler } from '../early-access/commands/activate-early-access.handler';
import { UpdateSubscriptionStatusHandler } from '../early-access/commands/update-subscription-status.handler';
import { HardcodedPlanProvider } from '../plan/hardcoded-plan-provider';
import { PLAN_PROVIDER_TOKEN } from '../plan/plan.interface';
import { UsageService } from '../usage/usage.service';

describe('EarlyAccessService', () => {
  let module: TestingModule;
  let service: EarlyAccessService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule],
      providers: [
        EarlyAccessService,
        ActivateEarlyAccessHandler,
        UpdateSubscriptionStatusHandler,
        BillingCacheService,
        UsageService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
        { provide: PLAN_PROVIDER_TOKEN, useClass: HardcodedPlanProvider },
      ],
    }).compile();

    await module.init();
    service = module.get(EarlyAccessService);
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

  describe('activateEarlyAccess', () => {
    it('should create subscription with early_adopter status', async () => {
      const orgId = await createOrg();

      const result = await service.activateEarlyAccess(orgId, 'pro');

      expect(result.organizationId).toBe(orgId);
      expect(result.planId).toBe('pro');
      expect(result.status).toBe(BillingStatus.early_adopter);
    });

    it('should update existing subscription to early_adopter', async () => {
      const orgId = await createOrg();
      await prisma.subscription.create({
        data: { organizationId: orgId, planId: 'free' },
      });

      const result = await service.activateEarlyAccess(orgId, 'pro');

      expect(result.planId).toBe('pro');
      expect(result.status).toBe(BillingStatus.early_adopter);

      const count = await prisma.subscription.count({
        where: { organizationId: orgId },
      });
      expect(count).toBe(1);
    });

    it('should reject invalid plan', async () => {
      const orgId = await createOrg();

      await expect(
        service.activateEarlyAccess(orgId, 'nonexistent'),
      ).rejects.toThrow('Invalid plan');
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should update status', async () => {
      const orgId = await createOrg();
      await prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId: 'pro',
          status: BillingStatus.early_adopter,
        },
      });

      const result = await service.updateSubscriptionStatus({
        organizationId: orgId,
        status: BillingStatus.active,
      });

      expect(result.status).toBe(BillingStatus.active);
      expect(result.planId).toBe('pro');
    });

    it('should update plan and status together', async () => {
      const orgId = await createOrg();
      await prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId: 'pro',
          status: BillingStatus.early_adopter,
        },
      });

      const result = await service.updateSubscriptionStatus({
        organizationId: orgId,
        status: BillingStatus.free,
        planId: 'free',
      });

      expect(result.status).toBe(BillingStatus.free);
      expect(result.planId).toBe('free');
    });

    it('should create subscription when none exists', async () => {
      const orgId = await createOrg();

      const result = await service.updateSubscriptionStatus({
        organizationId: orgId,
        status: BillingStatus.active,
        planId: 'pro',
      });

      expect(result.organizationId).toBe(orgId);
      expect(result.status).toBe(BillingStatus.active);
      expect(result.planId).toBe('pro');
    });
  });

  describe('getPlans', () => {
    it('should return all plans', async () => {
      const plans = await service.getPlans();
      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.id)).toEqual(['free', 'pro', 'enterprise']);
    });
  });

  describe('getOrgUsageSummary', () => {
    it('should return usage with limits for subscribed org', async () => {
      const orgId = await createOrg();
      await prisma.subscription.create({
        data: { organizationId: orgId, planId: 'free' },
      });

      const usage = await service.getOrgUsageSummary(orgId);

      expect(usage.rowVersions.current).toBe(0);
      expect(usage.rowVersions.limit).toBe(10_000);
      expect(usage.rowVersions.percentage).toBe(0);
      expect(usage.projects.limit).toBe(3);
      expect(usage.seats.limit).toBe(1);
    });

    it('should return null limits for org without subscription', async () => {
      const orgId = await createOrg();

      const usage = await service.getOrgUsageSummary(orgId);

      expect(usage.rowVersions.limit).toBeNull();
      expect(usage.rowVersions.percentage).toBeNull();
      expect(usage.projects.limit).toBeNull();
    });
  });
});
