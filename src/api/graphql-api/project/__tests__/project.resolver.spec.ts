import { ProjectResolver } from '../project.resolver';

describe('ProjectResolver', () => {
  it('delegates endpoint usage lookup to the billing service', async () => {
    const billingService = {
      getProjectEndpointLimit: jest.fn().mockResolvedValue(10),
      getProjectEndpointUsage: jest.fn().mockResolvedValue({
        current: 2,
        limit: 10,
        percentage: 20,
      }),
    };
    const resolver = new ProjectResolver(
      {} as never,
      {} as never,
      {} as never,
      billingService as never,
    );

    await expect(
      resolver.endpointUsage(
        {
          id: 'project-1',
          organizationId: 'org-1',
        } as never,
        {},
      ),
    ).resolves.toEqual({
      current: 2,
      limit: 10,
      percentage: 20,
    });
    expect(billingService.getProjectEndpointLimit).toHaveBeenCalledWith(
      'org-1',
    );
    expect(billingService.getProjectEndpointUsage).toHaveBeenCalledWith(
      'org-1',
      'project-1',
      { endpointLimit: 10 },
    );
  });

  it('memoizes endpoint limits per organization in the request context', async () => {
    const ctx = {};
    const billingService = {
      getProjectEndpointLimit: jest.fn().mockResolvedValue(10),
      getProjectEndpointUsage: jest
        .fn()
        .mockResolvedValue({ current: 1, limit: 10, percentage: 10 }),
    };
    const resolver = new ProjectResolver(
      {} as never,
      {} as never,
      {} as never,
      billingService as never,
    );

    await resolver.endpointUsage(
      { id: 'project-1', organizationId: 'org-1' } as never,
      ctx as never,
    );
    await resolver.endpointUsage(
      { id: 'project-2', organizationId: 'org-1' } as never,
      ctx as never,
    );

    expect(billingService.getProjectEndpointLimit).toHaveBeenCalledTimes(1);
    expect(billingService.getProjectEndpointUsage).toHaveBeenNthCalledWith(
      2,
      'org-1',
      'project-2',
      { endpointLimit: 10 },
    );
  });
});
