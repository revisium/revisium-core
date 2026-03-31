import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingOrganizationResolver,
  BillingQueryResolver,
  BillingMutationResolver,
} from '../early-access/graphql/billing.resolver';
import { EarlyAccessService } from '../early-access/early-access.service';

describe('BillingResolvers', () => {
  let earlyAccessService: Partial<EarlyAccessService>;
  let configValues: Record<string, string>;
  let configService: ConfigService;

  beforeEach(() => {
    configValues = {};
    earlyAccessService = {
      getPlans: jest.fn().mockResolvedValue([{ id: 'free' }]),
      activateEarlyAccess: jest.fn().mockResolvedValue({
        status: 'early_adopter',
      }),
      getOrgSubscription: jest.fn().mockResolvedValue({ planId: 'pro' }),
      getOrgUsageSummary: jest.fn().mockResolvedValue({
        rowVersions: { current: 100, limit: 10000, percentage: 1 },
      }),
    };
    configService = {
      get: (key: string) => configValues[key] ?? undefined,
    } as ConfigService;
  });

  describe('BillingOrganizationResolver', () => {
    it('should resolve subscription', async () => {
      const resolver = new BillingOrganizationResolver(
        earlyAccessService as EarlyAccessService,
      );
      const result = await resolver.subscription({ id: 'org-1' } as any);
      expect(result).toEqual({ planId: 'pro' });
    });

    it('should resolve usage', async () => {
      const resolver = new BillingOrganizationResolver(
        earlyAccessService as EarlyAccessService,
      );
      const result = await resolver.usage({ id: 'org-1' } as any);
      expect(result.rowVersions.current).toBe(100);
    });
  });

  describe('BillingQueryResolver', () => {
    it('should return plans', async () => {
      const resolver = new BillingQueryResolver(
        earlyAccessService as EarlyAccessService,
      );
      const result = await resolver.plans();
      expect(result).toHaveLength(1);
    });
  });

  describe('BillingMutationResolver', () => {
    it('should reject when early access disabled', () => {
      const resolver = new BillingMutationResolver(
        earlyAccessService as EarlyAccessService,
        configService,
      );
      expect(() =>
        resolver.activateEarlyAccess({
          organizationId: 'org-1',
          planId: 'pro',
        }),
      ).toThrow(BadRequestException);
    });

    it('should activate when enabled', async () => {
      configValues = { EARLY_ACCESS_ENABLED: 'true' };
      const resolver = new BillingMutationResolver(
        earlyAccessService as EarlyAccessService,
        configService,
      );
      const result = await resolver.activateEarlyAccess({
        organizationId: 'org-1',
        planId: 'pro',
      });
      expect(result.status).toBe('early_adopter');
    });
  });
});
