import { PlanLimitsModel, PlanModel } from './plan.model';

describe('PlanModel', () => {
  it('supports endpoint limits on the GraphQL model', () => {
    const limits = new PlanLimitsModel();
    limits.endpoints_per_project = 10;

    const plan = new PlanModel();
    plan.id = 'pro';
    plan.name = 'Pro';
    plan.isPublic = true;
    plan.monthlyPriceUsd = 12;
    plan.yearlyPriceUsd = 120;
    plan.limits = limits;

    expect(plan.limits.endpoints_per_project).toBe(10);
  });
});
