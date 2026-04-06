export const LIMITS_SERVICE_TOKEN = Symbol('LIMITS_SERVICE');

export enum LimitMetric {
  // Absolute metrics — total count across the org, never resets
  ROW_VERSIONS = 'row_versions',
  PROJECTS = 'projects',
  SEATS = 'seats',
  STORAGE_BYTES = 'storage_bytes',

  // Rate metrics — resets per time window
  API_CALLS = 'api_calls', // per day

  // Resource-level metrics — scoped to a specific entity
  ROWS_PER_TABLE = 'rows_per_table',
  TABLES_PER_REVISION = 'tables_per_revision',
  BRANCHES_PER_PROJECT = 'branches_per_project',
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
    context?: { revisionId?: string; tableId?: string; projectId?: string },
  ): Promise<LimitCheckResult>;
}
