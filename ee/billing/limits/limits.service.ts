import { Injectable, Logger } from '@nestjs/common';
import {
  ILimitsService,
  LimitCheckResult,
  LimitMetric,
} from 'src/features/billing/limits.interface';

@Injectable()
export class LimitsService implements ILimitsService {
  private readonly logger = new Logger(LimitsService.name);

  async checkLimit(
    organizationId: string,
    metric: LimitMetric,
    _increment?: number,
  ): Promise<LimitCheckResult> {
    // TODO: Implement real limit checking against billing data (ADR-0038)
    this.logger.debug(
      `Checking limit: org=${organizationId}, metric=${metric}`,
    );
    return { allowed: true };
  }
}
