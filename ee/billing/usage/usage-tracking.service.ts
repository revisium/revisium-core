import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingStatus } from 'src/__generated__/client';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UsageService } from './usage.service';

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async snapshotUsage(): Promise<void> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: [BillingStatus.active, BillingStatus.early_adopter] },
      },
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
    );
    const periodEnd = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
      999,
    );

    const metrics = Object.values(LimitMetric);

    for (const sub of subscriptions) {
      for (const metric of metrics) {
        try {
          const value = await this.usageService.computeUsage(
            sub.organizationId,
            metric,
          );
          await this.prisma.usageRecord.upsert({
            where: {
              subscriptionId_metric_periodStart: {
                subscriptionId: sub.id,
                metric,
                periodStart,
              },
            },
            create: {
              subscriptionId: sub.id,
              metric,
              value: BigInt(value),
              periodStart,
              periodEnd,
            },
            update: {
              value: BigInt(value),
              periodEnd,
            },
          });
        } catch (error) {
          this.logger.error(
            `Failed to snapshot usage for org=${sub.organizationId}, metric=${metric}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }

    this.logger.log(
      `Usage snapshot completed for ${subscriptions.length} subscriptions`,
    );
  }
}
