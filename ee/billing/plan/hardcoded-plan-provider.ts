import { Injectable } from '@nestjs/common';
import { IPlanProvider, Plan } from './plan.interface';

const HARDCODED_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    isPublic: true,
    sortOrder: 0,
    maxRowVersions: 10_000,
    maxProjects: 3,
    maxSeats: 1,
    maxStorageBytes: 500_000_000, // 500 MB
    maxApiCallsPerDay: 1_000,
    monthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    features: {},
  },
  {
    id: 'pro',
    name: 'Pro',
    isPublic: true,
    sortOrder: 1,
    maxRowVersions: 500_000,
    maxProjects: 20,
    maxSeats: 10,
    maxStorageBytes: 10_000_000_000, // 10 GB
    maxApiCallsPerDay: 50_000,
    monthlyPriceUsd: 29,
    yearlyPriceUsd: 290,
    features: {},
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    isPublic: true,
    sortOrder: 2,
    maxRowVersions: null,
    maxProjects: null,
    maxSeats: null,
    maxStorageBytes: null,
    maxApiCallsPerDay: null,
    monthlyPriceUsd: 99,
    yearlyPriceUsd: 990,
    features: { sso: true, audit: true, advancedRbac: true },
  },
];

@Injectable()
export class HardcodedPlanProvider implements IPlanProvider {
  async getPlans(): Promise<Plan[]> {
    return HARDCODED_PLANS;
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return HARDCODED_PLANS.find((p) => p.id === planId) ?? null;
  }
}
