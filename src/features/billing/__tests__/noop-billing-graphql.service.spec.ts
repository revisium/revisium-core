import { BadRequestException } from '@nestjs/common';
import { NoopBillingGraphqlService } from '../noop-billing-graphql.service';

describe('NoopBillingGraphqlService', () => {
  const service = new NoopBillingGraphqlService();

  it('getBillingConfiguration returns disabled', () => {
    expect(service.getBillingConfiguration()).toEqual({
      enabled: false,
    });
  });

  it('getPlans returns empty array', async () => {
    expect(await service.getPlans()).toEqual([]);
  });

  it('getAvailableProviders returns empty array', async () => {
    expect(await service.getAvailableProviders()).toEqual([]);
  });

  it('getSubscription returns null', async () => {
    expect(await service.getSubscription()).toBeNull();
  });

  it('getUsage returns null', async () => {
    expect(await service.getUsage()).toBeNull();
  });

  it('getProjectEndpointLimit returns undefined', async () => {
    expect(await service.getProjectEndpointLimit()).toBeUndefined();
  });

  it('getProjectEndpointUsage returns null', async () => {
    expect(await service.getProjectEndpointUsage()).toBeNull();
  });

  it('activateEarlyAccess throws', async () => {
    await expect(service.activateEarlyAccess()).rejects.toThrow(
      BadRequestException,
    );
  });

  it('createCheckout throws', async () => {
    await expect(
      service.createCheckout({
        organizationId: 'org-1',
        planId: 'pro',
        successUrl: 'https://example.com',
        cancelUrl: 'https://example.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('cancelSubscription throws', async () => {
    await expect(service.cancelSubscription()).rejects.toThrow(
      BadRequestException,
    );
  });
});
