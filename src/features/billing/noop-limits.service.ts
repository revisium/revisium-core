import { Injectable } from '@nestjs/common';
import {
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
  ): Promise<LimitCheckResult> {
    return { allowed: true };
  }
}
