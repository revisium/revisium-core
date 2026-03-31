import { AdminBillingController } from '../early-access/rest/admin-billing.controller';
import { EarlyAccessService } from '../early-access/early-access.service';

describe('AdminBillingController', () => {
  let controller: AdminBillingController;
  let earlyAccessService: Partial<EarlyAccessService>;

  beforeEach(() => {
    earlyAccessService = {
      updateSubscriptionStatus: jest.fn().mockResolvedValue({
        organizationId: 'org-1',
        planId: 'pro',
        status: 'active',
      }),
    };
    controller = new AdminBillingController(
      earlyAccessService as EarlyAccessService,
    );
  });

  it('should delegate to service', async () => {
    const result = await controller.updateSubscription({
      organizationId: 'org-1',
      status: 'active',
      planId: 'pro',
    });
    expect(result.status).toBe('active');
    expect(earlyAccessService.updateSubscriptionStatus).toHaveBeenCalledWith({
      organizationId: 'org-1',
      status: 'active',
      planId: 'pro',
    });
  });
});
