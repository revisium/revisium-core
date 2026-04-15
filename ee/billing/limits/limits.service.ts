import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BillingDbClient,
  ILimitsService,
  LimitCheckResult,
  LimitMetric,
} from 'src/features/billing/limits.interface';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
  OrgLimits,
} from '../billing-client.interface';
import { UsageService } from '../usage/usage.service';
import { BillingCacheService } from '../cache/billing-cache.service';

const LIMITS_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class LimitsService implements ILimitsService {
  private readonly logger = new Logger(LimitsService.name);
  private readonly limitsCache = new Map<
    string,
    { data: OrgLimits; expiresAt: number }
  >();

  private static readonly UNCACHED_METRICS: ReadonlySet<LimitMetric> = new Set([
    LimitMetric.PROJECTS,
    LimitMetric.SEATS,
    LimitMetric.BRANCHES_PER_PROJECT,
    LimitMetric.TABLES_PER_REVISION,
    LimitMetric.ENDPOINTS_PER_PROJECT,
  ]);

  constructor(
    @Inject(BILLING_CLIENT_TOKEN)
    private readonly billingClient: IBillingClient,
    private readonly usageService: UsageService,
    private readonly billingCache: BillingCacheService,
  ) {}

  async checkLimit(
    organizationId: string,
    metric: LimitMetric,
    increment: number = 1,
    context?: { revisionId?: string; tableId?: string; projectId?: string },
    db?: BillingDbClient,
  ): Promise<LimitCheckResult> {
    const orgLimits = await this.getOrgLimits(organizationId);
    if (!orgLimits) return { allowed: true };

    const limit = this.getLimitForMetric(orgLimits, metric);
    if (limit === null || limit === undefined) return { allowed: true };

    const current = await this.getUsage(organizationId, metric, context, db);
    const projected = current + increment;

    if (projected > limit) {
      this.logger.debug(
        `Limit exceeded: org=${organizationId}, metric=${metric}, current=${current}, limit=${limit}`,
      );
      return { allowed: false, current, limit, metric };
    }

    return { allowed: true, current, limit };
  }

  invalidateCache(organizationId: string): void {
    this.limitsCache.delete(organizationId);
  }

  private async getUsage(
    organizationId: string,
    metric: LimitMetric,
    context?: { revisionId?: string; tableId?: string; projectId?: string },
    db?: BillingDbClient,
  ): Promise<number> {
    if (LimitsService.UNCACHED_METRICS.has(metric)) {
      return this.usageService.computeUsage(organizationId, metric, context, db);
    }

    const cacheKey =
      context?.revisionId || context?.tableId || context?.projectId
        ? `${metric}:r=${context?.revisionId ?? ''}:t=${context?.tableId ?? ''}:p=${context?.projectId ?? ''}`
        : metric;

    return this.billingCache.usage(organizationId, cacheKey, () =>
      this.usageService.computeUsage(organizationId, metric, context, db),
    );
  }

  private getLimitForMetric(
    orgLimits: OrgLimits,
    metric: LimitMetric,
  ): number | null {
    const l = orgLimits.limits;
    switch (metric) {
      case LimitMetric.ROW_VERSIONS:
        return l.row_versions;
      case LimitMetric.PROJECTS:
        return l.projects;
      case LimitMetric.SEATS:
        return l.seats;
      case LimitMetric.STORAGE_BYTES:
        return l.storage_bytes;
      case LimitMetric.API_CALLS:
        return l.api_calls_per_day;
      case LimitMetric.ROWS_PER_TABLE:
        return l.rows_per_table;
      case LimitMetric.TABLES_PER_REVISION:
        return l.tables_per_revision;
      case LimitMetric.BRANCHES_PER_PROJECT:
        return l.branches_per_project;
      case LimitMetric.ENDPOINTS_PER_PROJECT:
        return l.endpoints_per_project;
      default:
        return null;
    }
  }

  private async getOrgLimits(
    organizationId: string,
  ): Promise<OrgLimits | null> {
    const cached = this.limitsCache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const limits = await this.billingClient.getOrgLimits(organizationId);
      this.limitsCache.set(organizationId, {
        data: limits,
        expiresAt: Date.now() + LIMITS_CACHE_TTL_MS,
      });
      return limits;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch limits for org=${organizationId}: ${error instanceof Error ? error.message : error}${cached ? ' (using stale cache)' : ' (fail-open)'}`,
      );
      return cached?.data ?? null;
    }
  }
}
