import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
} from './billing-client.interface';
import { UsageService } from './usage/usage.service';

@Injectable()
export class UsageReporterService {
  private readonly logger = new Logger(UsageReporterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
    @Inject(BILLING_CLIENT_TOKEN)
    private readonly billingClient: IBillingClient,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async reportAllUsage(): Promise<void> {
    if (!this.billingClient.configured) {
      return;
    }

    const orgs = await this.prisma.organization.findMany({
      select: { id: true },
    });

    let reported = 0;
    let skippedNoSubscription = 0;
    let failed = 0;
    for (const org of orgs) {
      try {
        const subscription = await this.billingClient.getSubscription(org.id);
        if (!subscription) {
          skippedNoSubscription++;
          continue;
        }

        const [rowVersions, projects, seats, storageBytes] = await Promise.all([
          this.usageService.computeUsage(org.id, LimitMetric.ROW_VERSIONS),
          this.usageService.computeUsage(org.id, LimitMetric.PROJECTS),
          this.usageService.computeUsage(org.id, LimitMetric.SEATS),
          this.usageService.computeUsage(org.id, LimitMetric.STORAGE_BYTES),
        ]);

        await this.billingClient.reportUsage(org.id, {
          row_versions: rowVersions,
          projects,
          seats,
          storage_bytes: storageBytes,
        });
        reported++;
      } catch (error) {
        failed++;
        this.logger.warn(
          `Failed to report usage for org=${org.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `Usage reporting completed: reported=${reported}, skipped_no_subscription=${skippedNoSubscription}, failed=${failed}, total=${orgs.length}`,
    );
  }
}
