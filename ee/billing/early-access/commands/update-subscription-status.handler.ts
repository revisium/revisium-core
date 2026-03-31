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
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!existing && !planId) {
      throw new BadRequestException(
        'planId is required when creating a new subscription',
      );
    }

    const subscription = existing
      ? await this.prisma.subscription.update({
          where: { organizationId },
          data: {
            ...(status !== undefined && { status }),
            ...(planId !== undefined && { planId }),
          },
        })
      : await this.prisma.subscription.create({
          data: {
            organizationId,
            planId: planId!,
            ...(status !== undefined && { status }),
          },
        });

    await this.billingCache.invalidateOrgBilling(organizationId);

    return subscription;
  }
}
