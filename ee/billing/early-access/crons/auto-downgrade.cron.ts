import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingStatus } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UpdateSubscriptionStatusCommand } from '../commands/update-subscription-status.command';

@Injectable()
export class AutoDowngradeCronService {
  private readonly logger = new Logger(AutoDowngradeCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async run(): Promise<void> {
    const transitionDateStr = this.configService.get<string>(
      'EARLY_ACCESS_TRANSITION_DATE',
    );
    if (!transitionDateStr) return;

    // Parse YYYY-MM-DD as local date (not UTC)
    const parts = transitionDateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      this.logger.error(
        `Invalid EARLY_ACCESS_TRANSITION_DATE: ${transitionDateStr}`,
      );
      return;
    }
    const [year, month, day] = parts;
    const transitionDate = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today.getTime() < transitionDate.getTime()) return;

    const earlyAdopters = await this.prisma.subscription.findMany({
      where: { status: BillingStatus.early_adopter },
    });

    if (earlyAdopters.length === 0) return;

    let downgraded = 0;
    let activated = 0;

    for (const sub of earlyAdopters) {
      try {
        if (sub.externalCustomerId) {
          // Has payment method → activate
          await this.commandBus.execute(
            new UpdateSubscriptionStatusCommand({
              organizationId: sub.organizationId,
              status: BillingStatus.active,
            }),
          );
          activated++;
        } else {
          // No payment method → downgrade to free
          await this.commandBus.execute(
            new UpdateSubscriptionStatusCommand({
              organizationId: sub.organizationId,
              status: BillingStatus.free,
              planId: 'free',
            }),
          );
          downgraded++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to transition org=${sub.organizationId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `Early access transition: ${activated} activated, ${downgraded} downgraded`,
    );
  }
}
