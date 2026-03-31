import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BillingCacheService } from '../../cache/billing-cache.service';
import { UpdateSubscriptionStatusCommand } from './update-subscription-status.command';

@CommandHandler(UpdateSubscriptionStatusCommand)
export class UpdateSubscriptionStatusHandler implements ICommandHandler<UpdateSubscriptionStatusCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingCache: BillingCacheService,
  ) {}

  async execute({ data }: UpdateSubscriptionStatusCommand) {
    const { organizationId, status, planId } = data;

    if (status === undefined && planId === undefined) {
      throw new BadRequestException(
        'At least one of status or planId must be provided',
      );
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!existing) {
      throw new BadRequestException(
        `No subscription found for organization ${organizationId}`,
      );
    }

    const subscription = await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        ...(status !== undefined && { status }),
        ...(planId !== undefined && { planId }),
      },
    });

    await this.billingCache.invalidateOrgBilling(organizationId);

    return subscription;
  }
}
