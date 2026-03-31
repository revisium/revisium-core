import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BillingStatus } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BillingCacheService } from '../../cache/billing-cache.service';
import { IPlanProvider, PLAN_PROVIDER_TOKEN } from '../../plan/plan.interface';
import { ActivateEarlyAccessCommand } from './activate-early-access.command';

@CommandHandler(ActivateEarlyAccessCommand)
export class ActivateEarlyAccessHandler implements ICommandHandler<ActivateEarlyAccessCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingCache: BillingCacheService,
    @Inject(PLAN_PROVIDER_TOKEN)
    private readonly planProvider: IPlanProvider,
  ) {}

  async execute({ data }: ActivateEarlyAccessCommand) {
    const { organizationId, planId } = data;

    const plan = await this.planProvider.getPlan(planId);
    if (!plan?.isPublic) {
      throw new BadRequestException('Invalid plan');
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId,
        status: BillingStatus.early_adopter,
      },
      update: {
        planId,
        status: BillingStatus.early_adopter,
      },
    });

    await this.billingCache.invalidateOrgBilling(organizationId);

    return subscription;
  }
}
