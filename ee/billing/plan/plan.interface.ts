export const PLAN_PROVIDER_TOKEN = Symbol('PLAN_PROVIDER');

export interface Plan {
  id: string; // "free", "pro", "enterprise"
  name: string;
  isPublic: boolean;
  sortOrder: number;
  maxRowVersions: number | null; // null = unlimited
  maxProjects: number | null;
  maxSeats: number | null;
  maxStorageBytes: number | null;
  maxApiCallsPerDay: number | null;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  features: Record<string, boolean>;
}

export interface IPlanProvider {
  getPlans(): Promise<Plan[]>;
  getPlan(planId: string): Promise<Plan | null>;
}
