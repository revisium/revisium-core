import { LimitExceededException } from '../limit-exceeded.exception';
import { LimitMetric } from '../limits.interface';

describe('LimitExceededException', () => {
  it('should format message with current and limit', () => {
    const exception = new LimitExceededException({
      allowed: false,
      current: 5,
      limit: 3,
      metric: LimitMetric.PROJECTS,
    });

    const response = exception.getResponse() as any;
    expect(response.code).toBe('LIMIT_EXCEEDED');
    expect(response.metric).toBe(LimitMetric.PROJECTS);
    expect(response.current).toBe(5);
    expect(response.limit).toBe(3);
  });

  it('should handle missing current and limit', () => {
    const exception = new LimitExceededException({
      allowed: false,
      metric: LimitMetric.SEATS,
    });

    const response = exception.getResponse() as any;
    expect(response.code).toBe('LIMIT_EXCEEDED');
    expect(response.metric).toBe(LimitMetric.SEATS);
  });

  it('should include message in response', () => {
    const exception = new LimitExceededException({
      allowed: false,
      current: 100,
      limit: 50,
      metric: LimitMetric.API_CALLS,
    });

    const response = exception.getResponse() as any;
    expect(response.message).toBe(
      'Plan limit exceeded for api_calls. Current: 100, Limit: 50',
    );
  });
});
