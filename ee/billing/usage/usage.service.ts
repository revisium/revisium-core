import { Injectable } from '@nestjs/common';
import { countOrgRowVersions } from 'src/__generated__/client/sql';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async findSubscription(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
    });
  }

  async computeUsage(
    organizationId: string,
    metric: LimitMetric,
  ): Promise<number> {
    switch (metric) {
      case LimitMetric.ROW_VERSIONS:
        return this.countRowVersions(organizationId);
      case LimitMetric.PROJECTS:
        return this.countProjects(organizationId);
      case LimitMetric.SEATS:
        return this.countSeats(organizationId);
      case LimitMetric.STORAGE_BYTES:
        return this.countStorageBytes(organizationId);
      case LimitMetric.API_CALLS:
        return this.countApiCalls(organizationId);
      default: {
        const _exhaustive: never = metric;
        throw new Error(`Unknown limit metric: ${_exhaustive}`);
      }
    }
  }

  /**
   * Count UNIQUE row versions across all revisions in all projects of the org.
   * Copy-on-write: unchanged rows share versionId - counted once.
   */
  private async countRowVersions(organizationId: string): Promise<number> {
    const result = await this.prisma.$queryRawTyped(
      countOrgRowVersions(organizationId),
    );
    return Number(result[0].count);
  }

  private async countProjects(organizationId: string): Promise<number> {
    return this.prisma.project.count({
      where: { organizationId, isDeleted: false },
    });
  }

  private async countSeats(organizationId: string): Promise<number> {
    return this.prisma.userOrganization.count({
      where: { organizationId },
    });
  }

  private async countStorageBytes(_organizationId: string): Promise<number> {
    // TODO: implement based on File plugin storage tracking
    return 0;
  }

  private async countApiCalls(_organizationId: string): Promise<number> {
    // TODO: implement based on API request tracking
    return 0;
  }
}
