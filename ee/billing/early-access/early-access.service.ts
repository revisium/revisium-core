import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { BillingStatus } from 'src/__generated__/client';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  IPlanProvider,
  Plan,
  PLAN_PROVIDER_TOKEN,
} from '../plan/plan.interface';
import { UsageService } from '../usage/usage.service';
import { ActivateEarlyAccessCommand } from './commands/activate-early-access.command';
import { UpdateSubscriptionStatusCommand } from './commands/update-subscription-status.command';

@Injectable()
export class EarlyAccessService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
    @Inject(PLAN_PROVIDER_TOKEN)
    private readonly planProvider: IPlanProvider,
  ) {}

  async activateEarlyAccess(organizationId: string, planId: string) {
    return this.commandBus.execute(
      new ActivateEarlyAccessCommand({ organizationId, planId }),
    );
  }

  async updateSubscriptionStatus(data: {
    organizationId: string;
    status?: BillingStatus;
    planId?: string;
  }) {
    return this.commandBus.execute(new UpdateSubscriptionStatusCommand(data));
  }

  async getPlans(): Promise<Plan[]> {
    return this.planProvider.getPlans();
  }

  async getOrgSubscription(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
    });
  }

  async getOrgUsageSummary(organizationId: string) {
    const subscription = await this.getOrgSubscription(organizationId);
    const plan = subscription
      ? await this.planProvider.getPlan(subscription.planId)
      : null;

    const [rowVersions, projects, seats, storageBytes] = await Promise.all([
      this.usageService.computeUsage(organizationId, LimitMetric.ROW_VERSIONS),
      this.usageService.computeUsage(organizationId, LimitMetric.PROJECTS),
      this.usageService.computeUsage(organizationId, LimitMetric.SEATS),
      this.usageService.computeUsage(organizationId, LimitMetric.STORAGE_BYTES),
    ]);

    return {
      rowVersions: this.buildMetric(rowVersions, plan?.maxRowVersions),
      projects: this.buildMetric(projects, plan?.maxProjects),
      seats: this.buildMetric(seats, plan?.maxSeats),
      storageBytes: this.buildMetric(storageBytes, plan?.maxStorageBytes),
    };
  }

  private buildMetric(
    current: number,
    limit: number | null = null,
  ): { current: number; limit: number | null; percentage: number | null } {
    return {
      current,
      limit,
      percentage:
        limit !== null && limit > 0
          ? Math.round((current / limit) * 10000) / 100
          : null,
    };
  }
}
