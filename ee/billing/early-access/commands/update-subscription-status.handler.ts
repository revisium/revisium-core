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

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) {
      throw new BadRequestException(
        `Organization ${organizationId} not found`,
      );
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId: planId ?? 'free',
        ...(status !== undefined && { status }),
      },
      update: {
        ...(status !== undefined && { status }),
        ...(planId !== undefined && { planId }),
      },
    });

    await this.billingCache.invalidateOrgBilling(organizationId);

    return subscription;
  }
}
