import { NoopLimitsService } from '../noop-limits.service';
import { LimitMetric } from '../limits.interface';

describe('NoopLimitsService', () => {
  let service: NoopLimitsService;

  beforeEach(() => {
    service = new NoopLimitsService();
  });

  it('should always return allowed', async () => {
    const result = await service.checkLimit('org-1', LimitMetric.PROJECTS);
    expect(result).toEqual({ allowed: true });
  });

  it('should return allowed regardless of metric', async () => {
    for (const metric of Object.values(LimitMetric)) {
      const result = await service.checkLimit('org-1', metric, 100);
      expect(result.allowed).toBe(true);
    }
  });
});
