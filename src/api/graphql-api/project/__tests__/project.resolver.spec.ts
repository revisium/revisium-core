import { ProjectResolver } from '../project.resolver';

describe('ProjectResolver', () => {
  it('delegates endpoint usage lookup to the billing service', async () => {
    const billingService = {
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
      resolver.endpointUsage({
        id: 'project-1',
        organizationId: 'org-1',
      } as never),
    ).resolves.toEqual({
      current: 2,
      limit: 10,
      percentage: 20,
    });
    expect(billingService.getProjectEndpointUsage).toHaveBeenCalledWith(
      'org-1',
      'project-1',
    );
  });
});
