export const LIMITS_SERVICE_TOKEN = Symbol('LIMITS_SERVICE');

export enum LimitMetric {
  ROW_VERSIONS = 'row_versions',
  PROJECTS = 'projects',
  SEATS = 'seats',
  STORAGE_BYTES = 'storage_bytes',
  API_CALLS = 'api_calls',
}

export interface LimitCheckResult {
  allowed: boolean;
  current?: number;
  limit?: number | null; // null = unlimited
  metric?: LimitMetric;
}

export interface ILimitsService {
  checkLimit(
    organizationId: string,
    metric: LimitMetric,
    increment?: number,
  ): Promise<LimitCheckResult>;
}
