import { Injectable } from '@nestjs/common';
import {
  BillingDbClient,
  ILimitsService,
  LimitCheckResult,
  LimitMetric,
} from './limits.interface';

@Injectable()
export class NoopLimitsService implements ILimitsService {
  async checkLimit(
    _organizationId: string,
    _metric: LimitMetric,
    _increment?: number,
    _context?: { revisionId?: string; tableId?: string; projectId?: string },
    _db?: BillingDbClient,
  ): Promise<LimitCheckResult> {
    return { allowed: true };
  }
}
