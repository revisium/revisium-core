import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingController } from '../early-access/rest/billing.controller';
import { EarlyAccessService } from '../early-access/early-access.service';

describe('BillingController', () => {
  let controller: BillingController;
  let earlyAccessService: Partial<EarlyAccessService>;
  let configValues: Record<string, string>;

  beforeEach(() => {
    configValues = {};
    earlyAccessService = {
      getPlans: jest.fn().mockResolvedValue([{ id: 'free' }, { id: 'pro' }]),
      activateEarlyAccess: jest.fn().mockResolvedValue({
        organizationId: 'org-1',
        planId: 'pro',
        status: 'early_adopter',
      }),
      getOrgSubscription: jest.fn().mockResolvedValue(null),
      getOrgUsageSummary: jest.fn().mockResolvedValue({
        rowVersions: { current: 0, limit: null, percentage: null },
        projects: { current: 0, limit: null, percentage: null },
        seats: { current: 0, limit: null, percentage: null },
        storageBytes: { current: 0, limit: null, percentage: null },
      }),
    };
    const configService = {
      get: (key: string) => configValues[key] ?? undefined,
    } as ConfigService;

    controller = new BillingController(
      earlyAccessService as EarlyAccessService,
      configService,
    );
  });

  describe('getPlans', () => {
    it('should return earlyAccess false by default', async () => {
      const result = await controller.getPlans();
      expect(result.earlyAccess).toBe(false);
      expect(result.plans).toHaveLength(2);
    });

    it('should return earlyAccess true when enabled', async () => {
      configValues = { EARLY_ACCESS_ENABLED: 'true' };
      const result = await controller.getPlans();
      expect(result.earlyAccess).toBe(true);
    });
  });

  describe('activateEarlyAccess', () => {
    it('should reject when early access is disabled', async () => {
      await expect(
        controller.activateEarlyAccess('org-1', { planId: 'pro' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate to service when enabled', async () => {
      configValues = { EARLY_ACCESS_ENABLED: 'true' };
      const result = await controller.activateEarlyAccess('org-1', {
        planId: 'pro',
      });
      expect(result.status).toBe('early_adopter');
      expect(earlyAccessService.activateEarlyAccess).toHaveBeenCalledWith(
        'org-1',
        'pro',
      );
    });
  });

  describe('getSubscription', () => {
    it('should delegate to service', async () => {
      await controller.getSubscription('org-1');
      expect(earlyAccessService.getOrgSubscription).toHaveBeenCalledWith(
        'org-1',
      );
    });
  });

  describe('getUsage', () => {
    it('should delegate to service', async () => {
      const result = await controller.getUsage('org-1');
      expect(result.rowVersions).toBeDefined();
      expect(earlyAccessService.getOrgUsageSummary).toHaveBeenCalledWith(
        'org-1',
      );
    });
  });
});
