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
  ): Promise<void> {
    const organizationId = await this.resolveOrganizationId(revisionId);
    const result = await this.limitsService.checkLimit(
      organizationId,
      metric,
      increment,
    );
    if (!result.allowed) {
      throw new LimitExceededException(result);
    }
  }

  private async resolveOrganizationId(revisionId: string): Promise<string> {
    const revision = await this.prisma.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: {
              select: { organizationId: true },
            },
          },
        },
      },
    });
    return revision.branch.project.organizationId;
  }
}
