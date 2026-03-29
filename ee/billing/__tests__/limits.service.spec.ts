import { LimitsService } from '../limits/limits.service';
import { LimitMetric } from 'src/features/billing/limits.interface';

describe('LimitsService (EE)', () => {
  let service: LimitsService;

  beforeEach(() => {
    service = new LimitsService();
  });

  it('should return allowed (placeholder)', async () => {
    const result = await service.checkLimit('org-1', LimitMetric.PROJECTS, 1);
    expect(result).toEqual({ allowed: true });
  });
});
