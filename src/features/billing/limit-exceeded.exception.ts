import { ForbiddenException } from '@nestjs/common';
import { LimitCheckResult, LimitMetric } from './limits.interface';

export class LimitExceededException extends ForbiddenException {
  constructor(
    public readonly metric: LimitMetric,
    public readonly result: LimitCheckResult,
  ) {
    super(
      `Limit exceeded for ${metric}: ${result.current ?? 0}/${result.limit ?? 'unknown'}`,
    );
  }
}
