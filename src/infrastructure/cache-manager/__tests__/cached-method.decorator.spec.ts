import { CachedMethod } from '../method-cache.decorator';
import {
  registerCacheService,
  getCacheServiceOrThrow,
  CacheLike,
} from '../cache.locator';
import { NoopBentoCache } from '../services/noop-bento-cache';

// Global namespace storage shared across facade instances
const globalNamespaces = new Map<
  string,
  { cache: Map<string, any>; tagIndex: Map<string, Set<string>> }
>();

const getNamespaceData = (namespace?: string) => {
  const ns = namespace || '__default__';
  if (!globalNamespaces.has(ns)) {
    globalNamespaces.set(ns, {
      cache: new Map<string, any>(),
      tagIndex: new Map<string, Set<string>>(),
    });
  }
  return globalNamespaces.get(ns)!;
};

// Helper to create a working cache facade for testing
const createTestCacheFacade = (currentNamespace?: string): CacheLike => {
  return {
    get: jest.fn().mockImplementation(async (options: { key: string }) => {
      const { cache } = getNamespaceData(currentNamespace);
      return cache.get(options.key);
    }),
    set: jest
      .fn()
      .mockImplementation(
        async (options: {
          key: string;
          value: any;
          ttl?: number;
          tags?: string[];
        }) => {
          const { cache, tagIndex } = getNamespaceData(currentNamespace);
          cache.set(options.key, options.value);
          // Handle tags
          if (options.tags?.length) {
            options.tags.forEach((tag: string) => {
              if (!tagIndex.has(tag)) {
                tagIndex.set(tag, new Set());
              }
              tagIndex.get(tag)!.add(options.key);
            });
          }
        },
      ),
    deleteByTag: jest
      .fn()
      .mockImplementation(async (options: { tags: string[] }) => {
        const { cache, tagIndex } = getNamespaceData(currentNamespace);
        const keysToDelete = new Set<string>();
        options.tags.forEach((tag) => {
          const keys = tagIndex.get(tag);
          if (keys) {
            keys.forEach((key) => keysToDelete.add(key));
          }
        });
        keysToDelete.forEach((key) => {
          cache.delete(key);
        });
        options.tags.forEach((tag) => {
          tagIndex.delete(tag);
        });
      }),
    namespace: jest.fn().mockImplementation((name: string) => {
      // Return a facade bound to specific namespace
      return createTestCacheFacade(name);
    }),
  };
};

describe('@CachedMethod', () => {
  // Test service class with decorated methods
  class TestService {
    public callCount = 0;

    @CachedMethod({
      key: 'user',
      makeKey: (args: [{ id: number }]) => String(args[0].id),
      makeTags: (args: [{ id: number }]) => [`user:${args[0].id}`],
      ttl: 60 * 1000, // 60 seconds in milliseconds
    })
    async getUser(arg: { id: number }): Promise<string> {
      this.callCount++;
      return `user:${arg.id}:data`;
    }

    @CachedMethod({
      key: 'compute',
      makeKey: (args) => JSON.stringify(args),
      ttl: 30 * 1000, // 30 seconds in milliseconds
    })
    async expensiveComputation(
      a: number,
      b: string,
    ): Promise<{ result: string }> {
      this.callCount++;
      return { result: `${a}-${b}-computed` };
    }

    @CachedMethod({
      key: 'noargs',
    })
    async getConstantValue(): Promise<string> {
      this.callCount++;
      return 'constant';
    }

    @CachedMethod({
      key: 'tagged',
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
    globalNamespaces.clear();
  });

  describe('when cache is disabled (NoopCacheService)', () => {
    beforeEach(() => {
      registerCacheService(new NoopBentoCache());
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

  describe('with working cache facade', () => {
    beforeEach(() => {
      const facade = createTestCacheFacade();
      registerCacheService(facade);
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
      await cache.deleteByTag({ tags: ['user:1'] });

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
      const cachedValue = await cache.get({
        key: 'compute:' + JSON.stringify([42, 'test']),
      });
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
      await cache.deleteByTag({ tags: ['category:electronics'] });

      // Electronics should be recomputed, books should be cached
      await testService.getByCategory('electronics');
      await testService.getByCategory('books');
      expect(testService.callCount).toBe(3); // one additional call for electronics
    });
  });

  describe('with namespace support', () => {
    beforeEach(() => {
      const facade = createTestCacheFacade();
      registerCacheService(facade);
    });

    it('decorator with namespace works correctly', async () => {
      class NamespaceTestService {
        public callCount = 0;

        @CachedMethod({
          key: 'ns-test',
          namespace: 'test-namespace',
        })
        async getValue(): Promise<string> {
          this.callCount++;
          return 'namespaced-value';
        }
      }

      const service = new NamespaceTestService();

      const result1 = await service.getValue();
      const result2 = await service.getValue();

      expect(result1).toBe('namespaced-value');
      expect(result2).toBe('namespaced-value');
      expect(service.callCount).toBe(1); // cached on second call
    });

    it('different namespaces isolate cache entries', async () => {
      class MultiNamespaceService {
        public callCount = 0;

        @CachedMethod({
          key: 'multi',
          namespace: 'ns1',
        })
        async getFromNs1(): Promise<string> {
          this.callCount++;
          return 'value-ns1';
        }

        @CachedMethod({
          key: 'multi',
          namespace: 'ns2',
        })
        async getFromNs2(): Promise<string> {
          this.callCount++;
          return 'value-ns2';
        }
      }

      const service = new MultiNamespaceService();

      // Cache values in different namespaces
      await service.getFromNs1();
      await service.getFromNs2();
      expect(service.callCount).toBe(2);

      // Calls should be cached independently
      await service.getFromNs1();
      await service.getFromNs2();
      expect(service.callCount).toBe(2); // no additional calls
    });
  });

  describe('decorator configuration', () => {
    class ConfigTestService {
      public callCount = 0;

      @CachedMethod({
        key: 'config-test',
        makeKey: (args) => `custom-${args[0]}`,
        makeTags: (args, result) => [`result:${result?.length || 0}`],
        ttl: 120 * 1000, // 120 seconds in milliseconds
      })
      async getItems(filter: string): Promise<string[]> {
        this.callCount++;
        return [`item-${filter}-1`, `item-${filter}-2`];
      }

      // Test default values
      @CachedMethod({
        key: 'defaults',
      })
      async getWithDefaults(): Promise<string> {
        this.callCount++;
        return 'default-result';
      }
    }

    let configService: ConfigTestService;

    beforeEach(() => {
      configService = new ConfigTestService();
      const facade = createTestCacheFacade();
      registerCacheService(facade);
    });

    it('uses custom makeKey function', async () => {
      await configService.getItems('test');

      const cache = getCacheServiceOrThrow();
      const cachedValue = await cache.get({ key: 'config-test:custom-test' });
      expect(cachedValue).toEqual(['item-test-1', 'item-test-2']);
    });

    it('uses makeTags with result parameter', async () => {
      await configService.getItems('test');

      const cache = getCacheServiceOrThrow();

      // Tag should be based on result length (2 items)
      await cache.deleteByTag({ tags: ['result:2'] });

      // Should cause re-execution
      await configService.getItems('test');
      expect(configService.callCount).toBe(2);
    });

    it('uses custom TTL', async () => {
      // This is hard to test without time manipulation, but we can verify the TTL is passed
      const cache = getCacheServiceOrThrow();
      const setSpy = jest.spyOn(cache, 'set');

      await configService.getItems('test');

      expect(setSpy).toHaveBeenCalledWith({
        key: 'config-test:custom-test',
        value: ['item-test-1', 'item-test-2'],
        ttl: 120 * 1000,
        tags: ['result:2'],
      });

      setSpy.mockRestore();
    });

    it('uses default values when not specified', async () => {
      const cache = getCacheServiceOrThrow();
      const setSpy = jest.spyOn(cache, 'set');

      await configService.getWithDefaults();

      expect(setSpy).toHaveBeenCalledWith({
        key: 'defaults:[]',
        value: 'default-result',
        ttl: undefined, // no default TTL set
        tags: undefined, // no tags
      });

      setSpy.mockRestore();
    });
  });

  describe('error scenarios', () => {
    beforeEach(() => {
      const facade = createTestCacheFacade();
      registerCacheService(facade);
    });

    it('undefined results are not cached', async () => {
      class TestService {
        public callCount = 0;

        @CachedMethod({ key: 'maybe' })
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
      expect(setSpy).toHaveBeenCalledWith({
        key: 'maybe:[1]',
        value: 'result:1',
        ttl: undefined,
        tags: undefined,
      });
      expect(setSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'maybe:[-1]',
          value: undefined,
        }),
      );

      setSpy.mockRestore();
    });

    it('method errors are not cached', async () => {
      class ErrorService {
        public callCount = 0;

        @CachedMethod({ key: 'error' })
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
        @CachedMethod({ key: 'unregistered' })
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
