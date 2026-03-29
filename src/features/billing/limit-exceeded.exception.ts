import { ForbiddenException } from '@nestjs/common';
import { LimitCheckResult } from './limits.interface';

export class LimitExceededException extends ForbiddenException {
  constructor(result: LimitCheckResult) {
    super({
      code: 'LIMIT_EXCEEDED',
      metric: result.metric,
      current: result.current,
      limit: result.limit,
      message: `Plan limit exceeded for ${result.metric ?? 'unknown'}. Current: ${result.current ?? 0}, Limit: ${result.limit ?? 'unknown'}`,
    });
  }
}
