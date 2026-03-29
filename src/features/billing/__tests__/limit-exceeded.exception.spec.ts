import { LimitExceededException } from '../limit-exceeded.exception';
import { LimitMetric } from '../limits.interface';

describe('LimitExceededException', () => {
  it('should format message with current and limit', () => {
    const exception = new LimitExceededException(LimitMetric.PROJECTS, {
      allowed: false,
      current: 5,
      limit: 3,
      metric: LimitMetric.PROJECTS,
    });

    expect(exception.message).toBe('Limit exceeded for projects: 5/3');
    expect(exception.metric).toBe(LimitMetric.PROJECTS);
    expect(exception.result.allowed).toBe(false);
  });

  it('should handle missing current and limit', () => {
    const exception = new LimitExceededException(LimitMetric.SEATS, {
      allowed: false,
    });

    expect(exception.message).toBe('Limit exceeded for seats: 0/unknown');
  });

  it('should handle null limit (unlimited)', () => {
    const exception = new LimitExceededException(LimitMetric.API_CALLS, {
      allowed: false,
      current: 100,
      limit: null,
    });

    expect(exception.message).toBe('Limit exceeded for api_calls: 100/unknown');
  });
});
