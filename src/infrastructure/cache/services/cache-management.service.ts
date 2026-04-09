import { Injectable, Logger } from '@nestjs/common';
import { bentocacheRegistry } from 'src/infrastructure/cache/revisium-cache.module';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';

interface MetricByKey {
  key: string;
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  hitRate: number;
}

interface CacheStats {
  totalHits: number;
  totalMisses: number;
  totalWrites: number;
  totalDeletes: number;
  totalClears: number;
  overallHitRate: number;
  byCategory: MetricByKey[];
}

interface MetricJSON {
  name: string;
  values: Array<{
    value: number;
    labels: Record<string, string>;
  }>;
}

@Injectable()
export class CacheManagementService {
  private readonly logger = new Logger(CacheManagementService.name);

  constructor(private readonly cacheService: CacheService) {}

  async getStats(): Promise<CacheStats> {
    const metrics =
      (await bentocacheRegistry.getMetricsAsJSON()) as MetricJSON[];

    const hitsMetric = metrics.find((m) => m.name === 'bentocache_hits');
    const missesMetric = metrics.find((m) => m.name === 'bentocache_misses');
    const writesMetric = metrics.find((m) => m.name === 'bentocache_writes');
    const deletesMetric = metrics.find((m) => m.name === 'bentocache_deletes');
    const clearsMetric = metrics.find((m) => m.name === 'bentocache_clears');

    const totalHits = this.sumMetricValues(hitsMetric);
    const totalMisses = this.sumMetricValues(missesMetric);
    const totalWrites = this.sumMetricValues(writesMetric);
    const totalDeletes = this.sumMetricValues(deletesMetric);
    const totalClears = this.sumMetricValues(clearsMetric);

    const total = totalHits + totalMisses;
    const overallHitRate = total > 0 ? totalHits / total : 0;

    const byCategory = this.aggregateByKey(
      hitsMetric,
      missesMetric,
      writesMetric,
      deletesMetric,
    );

    return {
      totalHits,
      totalMisses,
      totalWrites,
      totalDeletes,
      totalClears,
      overallHitRate,
      byCategory,
    };
  }

  async clearAll(): Promise<boolean> {
    this.logger.warn('Clearing all cache (admin action)');
    await this.cacheService.clear();
    bentocacheRegistry.resetMetrics();
    return true;
  }

  private sumMetricValues(metric: MetricJSON | undefined): number {
    if (!metric?.values) {
      return 0;
    }

    return metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
  }

  private aggregateByKey(
    hitsMetric: MetricJSON | undefined,
    missesMetric: MetricJSON | undefined,
    writesMetric: MetricJSON | undefined,
    deletesMetric: MetricJSON | undefined,
  ): MetricByKey[] {
    const keyMap = new Map<
      string,
      { hits: number; misses: number; writes: number; deletes: number }
    >();

    const addValues = (
      metric: MetricJSON | undefined,
      field: 'hits' | 'misses' | 'writes' | 'deletes',
    ) => {
      if (!metric?.values) {
        return;
      }

      for (const v of metric.values) {
        const key = v.labels?.key || 'unknown';
        if (!keyMap.has(key)) {
          keyMap.set(key, { hits: 0, misses: 0, writes: 0, deletes: 0 });
        }
        keyMap.get(key)![field] += v.value || 0;
      }
    };

    addValues(hitsMetric, 'hits');
    addValues(missesMetric, 'misses');
    addValues(writesMetric, 'writes');
    addValues(deletesMetric, 'deletes');

    return Array.from(keyMap.entries()).map(([key, data]) => {
      const total = data.hits + data.misses;
      return {
        key,
        ...data,
        hitRate: total > 0 ? data.hits / total : 0,
      };
    });
  }
}
