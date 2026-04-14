import { Inject, Injectable } from '@nestjs/common';
import {
  ILimitsService,
  LimitMetric,
  LIMITS_SERVICE_TOKEN,
} from 'src/features/billing/limits.interface';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class BillingCheckService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LIMITS_SERVICE_TOKEN)
    private readonly limitsService: ILimitsService,
  ) {}

  async check(
    revisionId: string,
    metric: LimitMetric,
    increment?: number,
    context?: { tableId?: string; projectId?: string },
  ): Promise<void> {
    const resolved = await this.resolveContext(revisionId);
    const needsContext =
      metric === LimitMetric.ROWS_PER_TABLE ||
      metric === LimitMetric.TABLES_PER_REVISION ||
      metric === LimitMetric.BRANCHES_PER_PROJECT ||
      metric === LimitMetric.ENDPOINTS_PER_PROJECT;
    const fullContext = needsContext
      ? {
          revisionId,
          projectId: resolved.projectId,
          ...context,
        }
      : context;
    const result = await this.limitsService.checkLimit(
      resolved.organizationId,
      metric,
      increment,
      fullContext,
    );
    if (!result.allowed) {
      throw new LimitExceededException(result);
    }
  }

  private async resolveContext(
    revisionId: string,
  ): Promise<{ organizationId: string; projectId: string }> {
    const revision = await this.prisma.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: {
              select: { id: true, organizationId: true },
            },
          },
        },
      },
    });
    return {
      organizationId: revision.branch.project.organizationId,
      projectId: revision.branch.project.id,
    };
  }
}
