import { CachedMethod } from '../method-cache.decorator';
import { registerCacheService, getCacheServiceOrThrow } from '../cache.locator';
import { CacheService } from '../services/cache.service';
import { InMemoryAdapter } from '../adapters/in-memory.adapter';
import { NoopCacheService } from '../services/noop-cache.service';
import { CacheAdapter } from '../adapters/cache.adapter';

// Mock L2 adapter for testing
const createMockL2Adapter = (): jest.Mocked<CacheAdapter> => {
  const storage = new Map<string, any>();

  return {
    get: jest.fn().mockImplementation(async (key: string) => storage.get(key)),
    set: jest.fn().mockImplementation(async (key: string, value: any) => {
      storage.set(key, value);
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      storage.delete(key);
    }),
    delByTags: jest.fn().mockImplementation(async (_tags: string[]) => {
      // Simple implementation for testing
      for (const [key] of storage.entries()) {
        storage.delete(key);
      }
    }),
  };
};

describe('@CachedMethod', () => {
  // Test service class with decorated methods
  class TestService {
    public callCount = 0;

    @CachedMethod({
      keyPrefix: 'user',
      makeKey: (args: [{ id: number }]) => String(args[0].id),
      makeTags: (args: [{ id: number }]) => [`user:${args[0].id}`],
      ttlSec: 60,
    })
    async getUser(arg: { id: number }): Promise<string> {
      this.callCount++;
      return `user:${arg.id}:data`;
    }

    @CachedMethod({
      keyPrefix: 'compute',
      makeKey: (args) => JSON.stringify(args),
      ttlSec: 30,
    })
    async expensiveComputation(
      a: number,
      b: string,
    ): Promise<{ result: string }> {
      this.callCount++;
      return { result: `${a}-${b}-computed` };
    }

    @CachedMethod({
      keyPrefix: 'noargs',
    })
    async getConstantValue(): Promise<string> {
      this.callCount++;
      return 'constant';
    }

    @CachedMethod({
      keyPrefix: 'tagged',
      makeTags: ([category]) => [`category:${category}`],
    })
    async getByCategory(category: string): Promise<string[]> {
      this.callCount++;
      return [`item1-${category}`, `item2-${category}`];
    }
  }

  let testService: TestService;

  beforeEach(() => {
    testService = new TestService();
  });

  afterEach(() => {
    // Reset call counters and cache state between tests
    testService.callCount = 0;
  });

  describe('when cache is disabled (NoopCacheService)', () => {
    beforeEach(() => {
      registerCacheService(new NoopCacheService());
    });

    it('always executes method (no caching)', async () => {
      const result1 = await testService.getUser({ id: 1 });
      const result2 = await testService.getUser({ id: 1 });

      expect(result1).toBe('user:1:data');
      expect(result2).toBe('user:1:data');
      expect(testService.callCount).toBe(2); // called both times
    });

    it('works with multiple arguments', async () => {
      const result1 = await testService.expensiveComputation(42, 'test');
      const result2 = await testService.expensiveComputation(42, 'test');

      expect(result1).toEqual({ result: '42-test-computed' });
      expect(result2).toEqual({ result: '42-test-computed' });
      expect(testService.callCount).toBe(2); // no caching
    });
  });

  describe('with L1 cache (InMemoryAdapter)', () => {
    beforeEach(() => {
      const l1 = new InMemoryAdapter();
      registerCacheService(new CacheService(l1));
    });

    it('caches result on second call', async () => {
      const result1 = await testService.getUser({ id: 1 });
      const result2 = await testService.getUser({ id: 1 });

      expect(result1).toBe('user:1:data');
      expect(result2).toBe('user:1:data');
      expect(testService.callCount).toBe(1); // only called once
    });

    it('makeKey produces distinct keys for different args', async () => {
      const result1 = await testService.getUser({ id: 1 });
      const result2 = await testService.getUser({ id: 2 });
      const result3 = await testService.getUser({ id: 1 }); // same as first

      expect(result1).toBe('user:1:data');
      expect(result2).toBe('user:2:data');
      expect(result3).toBe('user:1:data');
      expect(testService.callCount).toBe(2); // id:1 cached, id:2 new
    });

    it('makeTags enables tag-based invalidation', async () => {
      // Cache user 1
      const result1 = await testService.getUser({ id: 1 });
      expect(result1).toBe('user:1:data');
      expect(testService.callCount).toBe(1);

      // Invalidate by tag
      const cache = getCacheServiceOrThrow();
      await cache.delByTags(['user:1']);

      // Should execute again
      const result2 = await testService.getUser({ id: 1 });
      expect(result2).toBe('user:1:data');
      expect(testService.callCount).toBe(2);
    });

    it('handles methods with multiple arguments', async () => {
      const result1 = await testService.expensiveComputation(42, 'test');
      const result2 = await testService.expensiveComputation(42, 'test');
      const result3 = await testService.expensiveComputation(43, 'test'); // different args

      expect(result1).toEqual({ result: '42-test-computed' });
      expect(result2).toEqual({ result: '42-test-computed' });
      expect(result3).toEqual({ result: '43-test-computed' });
      expect(testService.callCount).toBe(2); // first two cached together
    });

    it('handles methods with no arguments', async () => {
      const result1 = await testService.getConstantValue();
      const result2 = await testService.getConstantValue();

      expect(result1).toBe('constant');
      expect(result2).toBe('constant');
      expect(testService.callCount).toBe(1);
    });

    it('default makeKey uses JSON.stringify', async () => {
      // This tests the default key generation
      await testService.expensiveComputation(42, 'test');
      await testService.expensiveComputation(42, 'test');

      expect(testService.callCount).toBe(1);

      // Key should be based on JSON.stringify([42, 'test'])
      const cache = getCacheServiceOrThrow();
      const cachedValue = await cache.get(
        'compute:' + JSON.stringify([42, 'test']),
      );
      expect(cachedValue).toEqual({ result: '42-test-computed' });
    });

    it('tag-based operations work with complex scenarios', async () => {
      // Cache items for different categories
      await testService.getByCategory('electronics');
      await testService.getByCategory('books');
      expect(testService.callCount).toBe(2);

      // Cache hits
      await testService.getByCategory('electronics');
      await testService.getByCategory('books');
      expect(testService.callCount).toBe(2); // no additional calls

      // Invalidate one category
      const cache = getCacheServiceOrThrow();
      await cache.delByTags(['category:electronics']);

      // Electronics should be recomputed, books should be cached
      await testService.getByCategory('electronics');
      await testService.getByCategory('books');
      expect(testService.callCount).toBe(3); // one additional call for electronics
    });
  });

  describe('with L1 + L2 cache', () => {
    let l2: jest.Mocked<CacheAdapter>;

    beforeEach(() => {
      const l1 = new InMemoryAdapter();
      l2 = createMockL2Adapter();
      registerCacheService(new CacheService(l1, l2));
    });

    it('hydrates from L2 when L1 misses', async () => {
      // Simulate value only in L2
      l2.get.mockResolvedValueOnce('user:1:data');

      const result = await testService.getUser({ id: 1 });
      expect(result).toBe('user:1:data');
      expect(testService.callCount).toBe(0); // served from L2, no method execution

      // Second call should hit L1 (now hydrated)
      l2.get.mockClear();
      const result2 = await testService.getUser({ id: 1 });
      expect(result2).toBe('user:1:data');
      expect(testService.callCount).toBe(0); // still no method execution
      expect(l2.get).not.toHaveBeenCalled(); // L1 hit
    });

    it('writes to both L1 and L2 on cache miss', async () => {
      const result = await testService.getUser({ id: 1 });

      expect(result).toBe('user:1:data');
      expect(testService.callCount).toBe(1);

      // L2 should have been written to
      expect(l2.set).toHaveBeenCalledWith('user:1', 'user:1:data', {
        ttlSec: 60,
        tags: ['user:1'],
      });
    });

    it('tag invalidation clears both layers', async () => {
      // Cache a value
      await testService.getUser({ id: 1 });

      // Invalidate by tag
      const cache = getCacheServiceOrThrow();
      await cache.delByTags(['user:1']);

      // Should have called L2 delByTags
      expect(l2.delByTags).toHaveBeenCalledWith(['user:1']);

      // Next call should execute method again
      const result = await testService.getUser({ id: 1 });
      expect(result).toBe('user:1:data');
      expect(testService.callCount).toBe(2); // called twice
    });
  });

  describe('decorator configuration', () => {
    class ConfigTestService {
      public callCount = 0;

      @CachedMethod({
        keyPrefix: 'config-test',
        makeKey: (args) => `custom-${args[0]}`,
        makeTags: (args, result) => [`result:${result?.length || 0}`],
        ttlSec: 120,
      })
      async getItems(filter: string): Promise<string[]> {
        this.callCount++;
        return [`item-${filter}-1`, `item-${filter}-2`];
      }

      // Test default values
      @CachedMethod({
        keyPrefix: 'defaults',
      })
      async getWithDefaults(): Promise<string> {
        this.callCount++;
        return 'default-result';
      }
    }

    let configService: ConfigTestService;

    beforeEach(() => {
      configService = new ConfigTestService();
      const l1 = new InMemoryAdapter();
      registerCacheService(new CacheService(l1));
    });

    it('uses custom makeKey function', async () => {
      await configService.getItems('test');

      const cache = getCacheServiceOrThrow();
      const cachedValue = await cache.get('config-test:custom-test');
      expect(cachedValue).toEqual(['item-test-1', 'item-test-2']);
    });

    it('uses makeTags with result parameter', async () => {
      await configService.getItems('test');

      const cache = getCacheServiceOrThrow();

      // Tag should be based on result length (2 items)
      await cache.delByTags(['result:2']);

      // Should cause re-execution
      await configService.getItems('test');
      expect(configService.callCount).toBe(2);
    });

    it('uses custom TTL', async () => {
      // This is hard to test without time manipulation, but we can verify the TTL is passed
      const cache = getCacheServiceOrThrow();
      const setSpy = jest.spyOn(cache, 'set');

      await configService.getItems('test');

      expect(setSpy).toHaveBeenCalledWith(
        'config-test:custom-test',
        ['item-test-1', 'item-test-2'],
        { ttlSec: 120, tags: ['result:2'] },
      );

      setSpy.mockRestore();
    });

    it('uses default values when not specified', async () => {
      const cache = getCacheServiceOrThrow();
      const setSpy = jest.spyOn(cache, 'set');

      await configService.getWithDefaults();

      expect(setSpy).toHaveBeenCalledWith(
        'defaults:[]',
        'default-result',
        { ttlSec: 3600, tags: [] }, // default TTL and empty tags
      );

      setSpy.mockRestore();
    });
  });

  describe('error scenarios', () => {
    beforeEach(() => {
      const l1 = new InMemoryAdapter();
      registerCacheService(new CacheService(l1));
    });

    it('undefined results are not cached', async () => {
      class TestService {
        public callCount = 0;

        @CachedMethod({ keyPrefix: 'maybe' })
        async maybeReturn(id: number): Promise<string | undefined> {
          this.callCount++;
          return id > 0 ? `result:${id}` : undefined;
        }
      }

      const service = new TestService();
      const cache = getCacheServiceOrThrow();
      const setSpy = jest.spyOn(cache, 'set');

      // Call with negative ID - should return undefined
      const result1 = await service.maybeReturn(-1);
      expect(result1).toBeUndefined();
      expect(service.callCount).toBe(1);

      // Verify cache.set was NOT called for undefined result
      expect(setSpy).not.toHaveBeenCalled();

      // Call again with same args - should execute again (not cached)
      const result2 = await service.maybeReturn(-1);
      expect(result2).toBeUndefined();
      expect(service.callCount).toBe(2); // Called again

      // Call with positive ID - should cache the result
      const result3 = await service.maybeReturn(1);
      expect(result3).toBe('result:1');
      expect(service.callCount).toBe(3);

      // Verify cache.set WAS called for defined result but NOT for undefined
      expect(setSpy).toHaveBeenCalledWith(
        'maybe:[1]',
        'result:1',
        expect.anything(),
      );
      expect(setSpy).not.toHaveBeenCalledWith(
        'maybe:[-1]',
        undefined,
        expect.anything(),
      );

      setSpy.mockRestore();
    });

    it('method errors are not cached', async () => {
      class ErrorService {
        public callCount = 0;

        @CachedMethod({ keyPrefix: 'error' })
        async maybeError(shouldError: boolean): Promise<string> {
          this.callCount++;
          if (shouldError) {
            throw new Error('Method failed');
          }
          return 'success';
        }
      }

      const service = new ErrorService();

      // First call fails
      await expect(service.maybeError(true)).rejects.toThrow('Method failed');
      expect(service.callCount).toBe(1);

      // Second call should still execute (error not cached)
      const result = await service.maybeError(false);
      expect(result).toBe('success');
      expect(service.callCount).toBe(2);

      // Third call should use cached success result
      const result2 = await service.maybeError(false);
      expect(result2).toBe('success');
      expect(service.callCount).toBe(2); // no additional call
    });

    it('throws error when cache service not registered', async () => {
      // Clear the cache service
      const cache = getCacheServiceOrThrow();
      registerCacheService(undefined as any);

      class UnregisteredService {
        @CachedMethod({ keyPrefix: 'unregistered' })
        async test(): Promise<string> {
          return 'test';
        }
      }

      const service = new UnregisteredService();

      // Should throw when trying to get cache service
      await expect(service.test()).rejects.toThrow(
        'CacheService is not registered yet',
      );

      // Restore cache service
      registerCacheService(cache);
    });
  });
});
