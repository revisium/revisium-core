import { HardcodedPlanProvider } from '../plan/hardcoded-plan-provider';

describe('HardcodedPlanProvider', () => {
  let provider: HardcodedPlanProvider;

  beforeEach(() => {
    provider = new HardcodedPlanProvider();
  });

  it('should return all plans', async () => {
    const plans = await provider.getPlans();
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.id)).toEqual(['free', 'pro', 'enterprise']);
  });

  it('should return free plan by id', async () => {
    const plan = await provider.getPlan('free');
    expect(plan).toBeDefined();
    expect(plan!.maxRowVersions).toBe(10_000);
    expect(plan!.maxProjects).toBe(3);
    expect(plan!.maxSeats).toBe(1);
  });

  it('should return pro plan by id', async () => {
    const plan = await provider.getPlan('pro');
    expect(plan).toBeDefined();
    expect(plan!.maxRowVersions).toBe(500_000);
    expect(plan!.maxProjects).toBe(20);
    expect(plan!.monthlyPriceUsd).toBe(29);
  });

  it('should return enterprise plan with unlimited limits', async () => {
    const plan = await provider.getPlan('enterprise');
    expect(plan).toBeDefined();
    expect(plan!.maxRowVersions).toBeNull();
    expect(plan!.maxProjects).toBeNull();
    expect(plan!.maxSeats).toBeNull();
    expect(plan!.features).toEqual({
      sso: true,
      audit: true,
      advancedRbac: true,
    });
  });

  it('should return null for unknown plan', async () => {
    const plan = await provider.getPlan('nonexistent');
    expect(plan).toBeNull();
  });

  it('should have plans sorted by sortOrder', async () => {
    const plans = await provider.getPlans();
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].sortOrder).toBeGreaterThan(plans[i - 1].sortOrder);
    }
  });
});
