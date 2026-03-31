import { BillingStatus } from 'src/__generated__/client';

export class UpdateSubscriptionStatusCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly status?: BillingStatus;
      readonly planId?: string;
    },
  ) {}
}
