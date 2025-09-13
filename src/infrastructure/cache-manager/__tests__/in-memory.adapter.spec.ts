import { InMemoryAdapter } from '../adapters/in-memory.adapter';

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  describe('basic set/get/del operations', () => {
    it('set/get roundtrip', async () => {
      await adapter.set('key1', 'value1');
      expect(await adapter.get('key1')).toBe('value1');
    });

    it('get non-existent key returns undefined', async () => {
      expect(await adapter.get('nonexistent')).toBeUndefined();
    });

    it('del removes value', async () => {
      await adapter.set('key1', 'value1');
      expect(await adapter.get('key1')).toBe('value1');

      await adapter.del('key1');
      expect(await adapter.get('key1')).toBeUndefined();
    });

    it('handles various data types', async () => {
      await adapter.set('string', 'hello');
      await adapter.set('number', 42);
      await adapter.set('boolean', true);
      await adapter.set('object', { a: 1, b: 'test' });
      await adapter.set('array', [1, 2, 3]);

      expect(await adapter.get('string')).toBe('hello');
      expect(await adapter.get('number')).toBe(42);
      expect(await adapter.get('boolean')).toBe(true);
      expect(await adapter.get('object')).toEqual({ a: 1, b: 'test' });
      expect(await adapter.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('tag-based operations', () => {
    it('set with tags and retrieve normally', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      expect(await adapter.get('key1')).toBe('value1');
    });

    it('delByTags removes all keys with specified tags', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      await adapter.set('key2', 'value2', { tags: ['tag1'] });
      await adapter.set('key3', 'value3', { tags: ['tag3'] });
      await adapter.set('key4', 'value4'); // no tags

      // Delete by tag1 - should remove key1 and key2
      await adapter.delByTags(['tag1']);

      expect(await adapter.get('key1')).toBeUndefined();
      expect(await adapter.get('key2')).toBeUndefined();
      expect(await adapter.get('key3')).toBe('value3'); // still exists
      expect(await adapter.get('key4')).toBe('value4'); // still exists
    });

    it('delByTags with multiple tags removes keys with any of the tags', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1'] });
      await adapter.set('key2', 'value2', { tags: ['tag2'] });
      await adapter.set('key3', 'value3', { tags: ['tag3'] });

      await adapter.delByTags(['tag1', 'tag2']);

      expect(await adapter.get('key1')).toBeUndefined();
      expect(await adapter.get('key2')).toBeUndefined();
      expect(await adapter.get('key3')).toBe('value3'); // still exists
    });

    it('delByTags with non-existent tag does nothing', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1'] });

      await adapter.delByTags(['nonexistent-tag']);

      expect(await adapter.get('key1')).toBe('value1'); // still exists
    });

    it('handles overlapping tags correctly', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      await adapter.set('key2', 'value2', { tags: ['tag2', 'tag3'] });

      await adapter.delByTags(['tag2']);

      expect(await adapter.get('key1')).toBeUndefined(); // removed
      expect(await adapter.get('key2')).toBeUndefined(); // removed
    });
  });

  describe('TTL (time-to-live) support', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('respects TTL expiration', async () => {
      const ttlSec = 5;
      await adapter.set('key1', 'value1', { ttlSec });

      // Initially should be accessible
      expect(await adapter.get('key1')).toBe('value1');

      // Advance time by 4 seconds - still valid
      jest.advanceTimersByTime(4000);
      expect(await adapter.get('key1')).toBe('value1');

      // Advance time by 2 more seconds (6 total) - now expired
      jest.advanceTimersByTime(2000);
      expect(await adapter.get('key1')).toBeUndefined();
    });

    it('expired entries are cleaned up on access', async () => {
      const ttlSec = 1;
      await adapter.set('key1', 'value1', { ttlSec });

      // Advance past expiration
      jest.advanceTimersByTime(2000);

      // First get should return undefined and clean up
      expect(await adapter.get('key1')).toBeUndefined();

      // Verify it's actually removed (not just expired but still in cache)
      expect(await adapter.get('key1')).toBeUndefined();
    });

    it('entries without TTL never expire', async () => {
      await adapter.set('key1', 'value1'); // no TTL

      // Advance time significantly
      jest.advanceTimersByTime(1000000);

      expect(await adapter.get('key1')).toBe('value1');
    });

    it('TTL with tags works correctly', async () => {
      await adapter.set('key1', 'value1', { ttlSec: 1, tags: ['tag1'] });

      // Before expiration, delByTags should work
      await adapter.delByTags(['tag1']);
      expect(await adapter.get('key1')).toBeUndefined();
    });
  });

  describe('complex scenarios', () => {
    it('handles key overwrite correctly', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1'] });
      await adapter.set('key1', 'value2', { tags: ['tag2'] }); // overwrite

      expect(await adapter.get('key1')).toBe('value2');

      // Note: Current implementation doesn't clean up old tag references on overwrite
      // This is a known limitation - deleting by old tag will still remove the key
      await adapter.delByTags(['tag2']);
      expect(await adapter.get('key1')).toBeUndefined();
    });

    it('del cleans up tag references', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1'] });
      await adapter.set('key2', 'value2', { tags: ['tag1'] });

      await adapter.del('key1');

      // key2 should still be deletable by tag
      await adapter.delByTags(['tag1']);
      expect(await adapter.get('key2')).toBeUndefined();
    });

    it('handles empty tags array', async () => {
      await adapter.set('key1', 'value1', { tags: [] });
      expect(await adapter.get('key1')).toBe('value1');

      await adapter.delByTags([]);
      expect(await adapter.get('key1')).toBe('value1'); // still exists
    });
  });
});
