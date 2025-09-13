import { CacheService } from '../services/cache.service';
import { InMemoryAdapter } from '../adapters/in-memory.adapter';

describe('CacheService (L1 only)', () => {
  let l1: InMemoryAdapter;
  let service: CacheService;

  beforeEach(() => {
    l1 = new InMemoryAdapter();
    service = new CacheService(l1); // L1 only, no L2
  });

  describe('basic operations', () => {
    it('miss → set → hit workflow', async () => {
      // Initial miss
      expect(await service.get('key1')).toBeUndefined();

      // Set value
      await service.set('key1', 'value1');

      // Now hit
      expect(await service.get('key1')).toBe('value1');
    });

    it('del removes single key', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      await service.del('key1');

      expect(await service.get('key1')).toBeUndefined();
      expect(await service.get('key2')).toBe('value2'); // still exists
    });

    it('handles various data types', async () => {
      const testCases: Array<[string, any]> = [
        ['string', 'hello world'],
        ['number', 42],
        ['boolean', true],
        ['object', { a: 1, b: 'test', nested: { c: 3 } }],
        ['array', [1, 'two', { three: 3 }]],
        ['null', null],
      ];

      // Set all values
      for (const [key, value] of testCases) {
        await service.set(key, value);
      }

      // Verify all values
      for (const [key, expectedValue] of testCases) {
        expect(await service.get(key)).toEqual(expectedValue);
      }
    });
  });

  describe('tag-based operations', () => {
    it('delByTags removes multiple keys with same tag', async () => {
      await service.set('user:1', { name: 'Alice' }, { tags: ['users'] });
      await service.set('user:2', { name: 'Bob' }, { tags: ['users'] });
      await service.set('post:1', { title: 'Hello' }, { tags: ['posts'] });

      // Delete all users
      await service.delByTags(['users']);

      expect(await service.get('user:1')).toBeUndefined();
      expect(await service.get('user:2')).toBeUndefined();
      expect(await service.get('post:1')).toEqual({ title: 'Hello' }); // still exists
    });

    it('delByTags with multiple tags removes keys with any of those tags', async () => {
      await service.set('key1', 'value1', { tags: ['tag1'] });
      await service.set('key2', 'value2', { tags: ['tag2'] });
      await service.set('key3', 'value3', { tags: ['tag3'] });
      await service.set('key4', 'value4', { tags: ['tag1', 'tag2'] }); // multiple tags

      await service.delByTags(['tag1', 'tag2']);

      expect(await service.get('key1')).toBeUndefined(); // tag1
      expect(await service.get('key2')).toBeUndefined(); // tag2
      expect(await service.get('key4')).toBeUndefined(); // tag1 + tag2
      expect(await service.get('key3')).toBe('value3'); // tag3, still exists
    });

    it('delByTags with empty array does nothing', async () => {
      await service.set('key1', 'value1', { tags: ['tag1'] });

      await service.delByTags([]);

      expect(await service.get('key1')).toBe('value1'); // still exists
    });

    it('delByTags with non-existent tags does nothing', async () => {
      await service.set('key1', 'value1', { tags: ['tag1'] });

      await service.delByTags(['nonexistent']);

      expect(await service.get('key1')).toBe('value1'); // still exists
    });

    it('set without tags works normally', async () => {
      await service.set('key1', 'value1'); // no tags
      expect(await service.get('key1')).toBe('value1');

      await service.delByTags(['any-tag']);
      expect(await service.get('key1')).toBe('value1'); // unaffected
    });
  });

  describe('TTL support', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('respects TTL expiration', async () => {
      await service.set('key1', 'value1', { ttlSec: 5 });

      // Initially accessible
      expect(await service.get('key1')).toBe('value1');

      // Still valid after 4 seconds
      jest.advanceTimersByTime(4000);
      expect(await service.get('key1')).toBe('value1');

      // Expired after 6 seconds
      jest.advanceTimersByTime(2000);
      expect(await service.get('key1')).toBeUndefined();
    });

    it('TTL works with tags', async () => {
      await service.set('key1', 'value1', { ttlSec: 1, tags: ['temp'] });

      // Before expiration, tag deletion should work
      await service.delByTags(['temp']);
      expect(await service.get('key1')).toBeUndefined();
    });

    it('entries without TTL never expire', async () => {
      await service.set('key1', 'value1'); // no TTL

      jest.advanceTimersByTime(1000000); // long time

      expect(await service.get('key1')).toBe('value1');
    });
  });

  describe('edge cases', () => {
    it('handles key overwrite correctly', async () => {
      await service.set('key1', 'value1', { tags: ['tag1'] });
      await service.set('key1', 'value2', { tags: ['tag2'] }); // overwrite with different tags

      expect(await service.get('key1')).toBe('value2');

      // Note: Current implementation doesn't clean up old tag references on overwrite
      // This is a known limitation - deleting by old tag will still remove the key
      await service.delByTags(['tag2']);
      expect(await service.get('key1')).toBeUndefined();
    });

    it('del non-existent key does not error', async () => {
      await expect(service.del('nonexistent')).resolves.not.toThrow();
    });

    it('get after del returns undefined', async () => {
      await service.set('key1', 'value1');
      await service.del('key1');

      expect(await service.get('key1')).toBeUndefined();
    });

    it('multiple operations on same key', async () => {
      await service.set('counter', 1);
      expect(await service.get('counter')).toBe(1);

      await service.set('counter', 2);
      expect(await service.get('counter')).toBe(2);

      await service.del('counter');
      expect(await service.get('counter')).toBeUndefined();

      await service.set('counter', 3);
      expect(await service.get('counter')).toBe(3);
    });
  });

  describe('L1 adapter integration', () => {
    it('delegates operations to L1 adapter', async () => {
      // Spy on L1 adapter methods
      const getSpy = jest.spyOn(l1, 'get');
      const setSpy = jest.spyOn(l1, 'set');
      const delSpy = jest.spyOn(l1, 'del');
      const delByTagsSpy = jest.spyOn(l1, 'delByTags');

      await service.set('key1', 'value1', { ttlSec: 60, tags: ['tag1'] });
      await service.get('key1');
      await service.del('key1');
      await service.delByTags(['tag1']);

      expect(setSpy).toHaveBeenCalledWith('key1', 'value1', {
        ttlSec: 60,
        tags: ['tag1'],
      });
      expect(getSpy).toHaveBeenCalledWith('key1');
      expect(delSpy).toHaveBeenCalledWith('key1');
      expect(delByTagsSpy).toHaveBeenCalledWith(['tag1']);

      // Clean up spies
      getSpy.mockRestore();
      setSpy.mockRestore();
      delSpy.mockRestore();
      delByTagsSpy.mockRestore();
    });

    it('does not call L2 methods when L2 is not provided', async () => {
      // This test ensures the service correctly handles the optional L2 parameter
      await service.set('key1', 'value1');
      await service.get('key1');
      await service.del('key1');
      await service.delByTags(['tag1']);

      // Should not throw any errors about L2 being undefined
    });
  });
});
