import * as promClient from 'prom-client';
import { bentocacheRegistry } from 'src/infrastructure/cache/revisium-cache.module';
import { CacheManagementService } from 'src/infrastructure/cache/services/cache-management.service';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';

describe('CacheManagementService', () => {
  let service: CacheManagementService;
  let cacheService: CacheService;

  beforeEach(() => {
    bentocacheRegistry.clear();
    cacheService = { clear: jest.fn().mockResolvedValue(undefined) } as any;
    service = new CacheManagementService(cacheService);
  });

  afterEach(() => {
    bentocacheRegistry.clear();
  });

  describe('getStats', () => {
    it('returns zeros when no metrics registered', async () => {
      const stats = await service.getStats();

      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.totalWrites).toBe(0);
      expect(stats.totalDeletes).toBe(0);
      expect(stats.totalClears).toBe(0);
      expect(stats.overallHitRate).toBe(0);
      expect(stats.byCategory).toEqual([]);
    });

    it('returns aggregated stats from prometheus counters', async () => {
      const hits = new promClient.Counter({
        name: 'bentocache_hits',
        help: 'hits',
        labelNames: ['store', 'key'],
        registers: [bentocacheRegistry],
      });
      const misses = new promClient.Counter({
        name: 'bentocache_misses',
        help: 'misses',
        labelNames: ['store', 'key'],
        registers: [bentocacheRegistry],
      });
      const writes = new promClient.Counter({
        name: 'bentocache_writes',
        help: 'writes',
        labelNames: ['store', 'key'],
        registers: [bentocacheRegistry],
      });
      const deletes = new promClient.Counter({
        name: 'bentocache_deletes',
        help: 'deletes',
        labelNames: ['store', 'key'],
        registers: [bentocacheRegistry],
      });
      new promClient.Counter({
        name: 'bentocache_clears',
        help: 'clears',
        labelNames: ['store'],
        registers: [bentocacheRegistry],
      });

      hits.inc({ store: 'cache', key: 'auth-checks' }, 10);
      hits.inc({ store: 'cache', key: 'row-data' }, 5);
      misses.inc({ store: 'cache', key: 'auth-checks' }, 2);
      misses.inc({ store: 'cache', key: 'row-data' }, 1);
      writes.inc({ store: 'cache', key: 'auth-checks' }, 2);
      deletes.inc({ store: 'cache', key: 'row-data' }, 1);

      const stats = await service.getStats();

      expect(stats.totalHits).toBe(15);
      expect(stats.totalMisses).toBe(3);
      expect(stats.totalWrites).toBe(2);
      expect(stats.totalDeletes).toBe(1);
      expect(stats.overallHitRate).toBeCloseTo(15 / 18);
      expect(stats.byCategory).toHaveLength(2);

      const authChecks = stats.byCategory.find((c) => c.key === 'auth-checks');
      expect(authChecks).toBeDefined();
      expect(authChecks!.hits).toBe(10);
      expect(authChecks!.misses).toBe(2);
      expect(authChecks!.hitRate).toBeCloseTo(10 / 12);

      const rowData = stats.byCategory.find((c) => c.key === 'row-data');
      expect(rowData).toBeDefined();
      expect(rowData!.hits).toBe(5);
      expect(rowData!.deletes).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('clears cache and resets metrics', async () => {
      const hits = new promClient.Counter({
        name: 'bentocache_hits',
        help: 'hits',
        labelNames: ['store', 'key'],
        registers: [bentocacheRegistry],
      });
      hits.inc({ store: 'cache', key: 'test' }, 5);

      const result = await service.clearAll();

      expect(result).toBe(true);
      expect(cacheService.clear).toHaveBeenCalled();

      const stats = await service.getStats();
      expect(stats.totalHits).toBe(0);
    });
  });
});
