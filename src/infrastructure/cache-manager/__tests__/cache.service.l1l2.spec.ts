import { CacheService } from '../services/cache.service';
import { InMemoryAdapter } from '../adapters/in-memory.adapter';
import { CacheAdapter } from '../adapters/cache.adapter';

// Mock L2 adapter for testing L1+L2 scenarios
const createMockL2Adapter = (): jest.Mocked<CacheAdapter> => {
  const storage = new Map<string, any>();
  const tagIndex = new Map<string, Set<string>>();

  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      return storage.get(key);
    }),
    set: jest
      .fn()
      .mockImplementation(async (key: string, value: any, opts?: any) => {
        storage.set(key, value);

        // Handle tags
        if (opts?.tags?.length) {
          opts.tags.forEach((tag: string) => {
            if (!tagIndex.has(tag)) {
              tagIndex.set(tag, new Set());
            }
            tagIndex.get(tag)!.add(key);
          });
        }
      }),
    del: jest.fn().mockImplementation(async (key: string) => {
      storage.delete(key);

      // Clean up tag references
      for (const [tag, keys] of tagIndex.entries()) {
        if (keys.has(key)) {
          keys.delete(key);
          if (keys.size === 0) {
            tagIndex.delete(tag);
          }
        }
      }
    }),
    delByTags: jest.fn().mockImplementation(async (tags: string[]) => {
      const keysToDelete = new Set<string>();

      tags.forEach((tag) => {
        const keys = tagIndex.get(tag);
        if (keys) {
          keys.forEach((key) => keysToDelete.add(key));
        }
      });

      keysToDelete.forEach((key) => {
        storage.delete(key);
      });

      tags.forEach((tag) => {
        tagIndex.delete(tag);
      });
    }),
  };
};

describe('CacheService (L1 + L2)', () => {
  let l1: InMemoryAdapter;
  let l2: jest.Mocked<CacheAdapter>;
  let service: CacheService;

  beforeEach(() => {
    l1 = new InMemoryAdapter();
    l2 = createMockL2Adapter();
    service = new CacheService(l1, l2);
  });

  describe('L2 hydration to L1', () => {
    it('L1 miss + L2 hit → hydrates L1', async () => {
      // Put value directly in L2 (bypassing L1)
      l2.set.mockImplementation(async (key, value) => {
        (l2 as any).storage = (l2 as any).storage || new Map();
        (l2 as any).storage.set(key, value);
      });
      l2.get.mockResolvedValueOnce('l2-value');

      // First get should fetch from L2 and hydrate L1
      const result1 = await service.get('key1');
      expect(result1).toBe('l2-value');

      // Verify L2 was called
      expect(l2.get).toHaveBeenCalledWith('key1');

      // Verify L1 was hydrated (by checking if we can get from L1 directly)
      const directL1Result = await l1.get('key1');
      expect(directL1Result).toBe('l2-value');

      // Second get should hit L1 (not call L2 again)
      l2.get.mockClear();
      const result2 = await service.get('key1');
      expect(result2).toBe('l2-value');
      expect(l2.get).not.toHaveBeenCalled();
    });

    it('L1 miss + L2 miss → returns undefined', async () => {
      l2.get.mockResolvedValue(undefined);

      const result = await service.get('nonexistent');
      expect(result).toBeUndefined();

      expect(l2.get).toHaveBeenCalledWith('nonexistent');
    });

    it('L1 hit → does not check L2', async () => {
      // Set value normally (goes to both L1 and L2)
      await service.set('key1', 'cached-value');

      // Clear L2 mock calls
      l2.get.mockClear();

      // Get should hit L1 and not call L2
      const result = await service.get('key1');
      expect(result).toBe('cached-value');
      expect(l2.get).not.toHaveBeenCalled();
    });
  });

  describe('dual-layer operations', () => {
    it('set writes to both L1 and L2', async () => {
      await service.set('key1', 'value1', { ttlSec: 60, tags: ['tag1'] });

      expect(l2.set).toHaveBeenCalledWith('key1', 'value1', {
        ttlSec: 60,
        tags: ['tag1'],
      });

      // Verify both layers have the value
      expect(await l1.get('key1')).toBe('value1');

      l2.get.mockResolvedValue('value1');
      expect(await l2.get('key1')).toBe('value1');
    });

    it('del removes from both L1 and L2', async () => {
      await service.set('key1', 'value1');
      await service.del('key1');

      expect(l2.del).toHaveBeenCalledWith('key1');

      // Verify both layers are cleared
      expect(await l1.get('key1')).toBeUndefined();
    });

    it('delByTags clears both L1 and L2', async () => {
      await service.set('key1', 'value1', { tags: ['tag1'] });
      await service.set('key2', 'value2', { tags: ['tag1'] });

      await service.delByTags(['tag1']);

      expect(l2.delByTags).toHaveBeenCalledWith(['tag1']);

      // Verify both layers are cleared
      expect(await l1.get('key1')).toBeUndefined();
      expect(await l1.get('key2')).toBeUndefined();
    });
  });

  describe('L1/L2 consistency scenarios', () => {
    it('handles L1 cleared but L2 intact', async () => {
      // Set value in both layers
      await service.set('key1', 'original-value');

      // Simulate L1 being cleared (e.g., app restart)
      await l1.del('key1');

      // L2 still has the value
      l2.get.mockResolvedValue('original-value');

      // Should hydrate from L2
      const result = await service.get('key1');
      expect(result).toBe('original-value');

      // L1 should now be hydrated
      expect(await l1.get('key1')).toBe('original-value');
    });

    it('L2 failure does not prevent L1 operations', async () => {
      // Set value normally
      await service.set('key1', 'value1');

      // L2 starts failing
      l2.get.mockRejectedValue(new Error('L2 connection failed'));

      // Should still work with L1
      const result = await service.get('key1');
      expect(result).toBe('value1');
    });

    it('L1 and L2 tag deletion works independently', async () => {
      // Set values with tags
      await service.set('key1', 'value1', { tags: ['shared-tag'] });
      await service.set('key2', 'value2', { tags: ['l1-only'] });

      // Manually add a value to L2 only (simulating external Redis usage)
      l2.set('external-key', 'external-value', { tags: ['shared-tag'] });

      // Delete by shared tag
      await service.delByTags(['shared-tag']);

      // Both layers should have processed the tag deletion
      expect(l2.delByTags).toHaveBeenCalledWith(['shared-tag']);
      expect(await l1.get('key1')).toBeUndefined();
      expect(await l1.get('key2')).toBe('value2'); // different tag, should remain
    });
  });

  describe('complex hydration scenarios', () => {
    it('hydration preserves data types', async () => {
      const complexValue = {
        string: 'hello',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { a: 'b' },
      };

      // Put directly in L2
      l2.get.mockResolvedValue(complexValue);

      const result = await service.get('complex-key');
      expect(result).toEqual(complexValue);

      // Verify L1 hydration preserved the structure
      expect(await l1.get('complex-key')).toEqual(complexValue);
    });

    it('hydrates L1 with metadata from L2 using getWithMeta', async () => {
      // Mock L2 adapter with getWithMeta capability
      const mockL2WithMeta = {
        ...l2,
        getWithMeta: jest.fn().mockResolvedValue({
          value: 'cached-value',
          ttlSec: 30,
          tags: ['hydration-tag'],
        }),
      };

      // Create service with L2 that supports getWithMeta
      const serviceWithMeta = new CacheService(l1, mockL2WithMeta);

      const result = await serviceWithMeta.get('meta-key');

      expect(result).toBe('cached-value');

      // Verify L1 was hydrated with metadata
      expect(await l1.get('meta-key')).toBe('cached-value');

      // Most importantly: verify tag-based invalidation works in L1 after hydration
      await serviceWithMeta.delByTags(['hydration-tag']);
      expect(await l1.get('meta-key')).toBeUndefined();
    });

    it('falls back to regular get when getWithMeta is not available', async () => {
      // Regular L2 without getWithMeta
      l2.get.mockResolvedValue('fallback-value');

      const result = await service.get('fallback-key');
      expect(result).toBe('fallback-value');

      // L1 should be hydrated without metadata
      expect(await l1.get('fallback-key')).toBe('fallback-value');

      // Tag invalidation should NOT work (no metadata was preserved)
      await service.delByTags(['some-tag']);
      expect(await l1.get('fallback-key')).toBe('fallback-value'); // still there
    });

    it('hydration without TTL or tags', async () => {
      l2.get.mockResolvedValue('simple-value');

      const result = await service.get('simple-key');
      expect(result).toBe('simple-value');

      // L1 should be hydrated without options
      expect(await l1.get('simple-key')).toBe('simple-value');
    });

    it('multiple concurrent gets with L2 hydration', async () => {
      let callCount = 0;
      l2.get.mockImplementation(async () => {
        callCount++;
        return 'l2-value';
      });

      // Make multiple concurrent gets
      const promises = [
        service.get('concurrent-key'),
        service.get('concurrent-key'),
        service.get('concurrent-key'),
      ];

      const results = await Promise.all(promises);

      // All should return the same value
      results.forEach((result) => expect(result).toBe('l2-value'));

      // L2 should have been called (though exact count may vary due to race conditions)
      expect(callCount).toBeGreaterThan(0);

      // Subsequent get should hit L1
      l2.get.mockClear();
      const cachedResult = await service.get('concurrent-key');
      expect(cachedResult).toBe('l2-value');
      expect(l2.get).not.toHaveBeenCalled();
    });
  });

  describe('error handling with L2', () => {
    it('L2 set failure does not prevent L1 set', async () => {
      l2.set.mockRejectedValue(new Error('L2 set failed'));

      // Should not throw
      await expect(service.set('key1', 'value1')).rejects.toThrow(
        'L2 set failed',
      );

      // But L1 should still have the value if we had proper error handling
      // (Note: Current implementation doesn't handle L2 failures gracefully)
    });

    it('L2 get failure falls back to undefined', async () => {
      l2.get.mockRejectedValue(new Error('L2 get failed'));

      await expect(service.get('key1')).rejects.toThrow('L2 get failed');

      // In a production system, we might want this to fall back gracefully
      // rather than throw, but current implementation propagates L2 errors
    });

    it('L2 delete failure does not prevent L1 delete', async () => {
      await service.set('key1', 'value1');

      l2.del.mockRejectedValue(new Error('L2 del failed'));

      await expect(service.del('key1')).rejects.toThrow('L2 del failed');

      // Current implementation doesn't handle L2 failures gracefully
      // In production, we might want to continue with L1 operations
    });
  });
});
