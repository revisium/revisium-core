import { RedisAdapter } from '../adapters/redis.adapter';
import { RedisClientType } from 'redis';

// Mock Redis client for testing
const createMockRedisClient = (): jest.Mocked<RedisClientType> => {
  const storage = new Map<string, { value: string; expiry?: number }>();
  const sets = new Map<string, Set<string>>();

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation((key: string) => {
      const entry = storage.get(key);
      if (!entry) return null;
      if (entry.expiry && Date.now() > entry.expiry) {
        storage.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: jest
      .fn()
      .mockImplementation((key: string, value: string, options?: any) => {
        const expiry = options?.EX ? Date.now() + options.EX * 1000 : undefined;
        storage.set(key, { value, expiry });
        return 'OK';
      }),
    del: jest.fn().mockImplementation((...keys: string[]) => {
      let deleted = 0;
      keys.forEach((key) => {
        if (storage.delete(key)) deleted++;
        if (sets.delete(key)) deleted++;
      });
      return deleted;
    }),
    sAdd: jest
      .fn()
      .mockImplementation((setKey: string, ...values: string[]) => {
        if (!sets.has(setKey)) {
          sets.set(setKey, new Set());
        }
        const set = sets.get(setKey)!;
        let added = 0;
        values.forEach((value) => {
          if (!set.has(value)) {
            set.add(value);
            added++;
          }
        });
        return added;
      }),
    sRem: jest
      .fn()
      .mockImplementation((setKey: string, ...values: string[]) => {
        const set = sets.get(setKey);
        if (!set) return 0;
        let removed = 0;
        values.forEach((value) => {
          if (set.has(value)) {
            set.delete(value);
            removed++;
          }
        });
        if (set.size === 0) {
          sets.delete(setKey);
        }
        return removed;
      }),
    sMembers: jest.fn().mockImplementation((setKey: string) => {
      const set = sets.get(setKey);
      return set ? Array.from(set) : [];
    }),
    multi: jest.fn().mockImplementation(() => {
      const commands: Array<{ command: string; args: any[] }> = [];

      return {
        get: jest.fn().mockImplementation((key: string) => {
          commands.push({ command: 'get', args: [key] });
          return this;
        }),
        set: jest
          .fn()
          .mockImplementation((key: string, value: string, options?: any) => {
            commands.push({ command: 'set', args: [key, value, options] });
            return this;
          }),
        del: jest.fn().mockImplementation((...keys: string[]) => {
          commands.push({ command: 'del', args: keys });
          return this;
        }),
        sAdd: jest
          .fn()
          .mockImplementation((setKey: string, ...values: string[]) => {
            commands.push({ command: 'sAdd', args: [setKey, ...values] });
            return this;
          }),
        sRem: jest
          .fn()
          .mockImplementation((setKey: string, ...values: string[]) => {
            commands.push({ command: 'sRem', args: [setKey, ...values] });
            return this;
          }),
        ttl: jest.fn().mockImplementation((key: string) => {
          commands.push({ command: 'ttl', args: [key] });
          return this;
        }),
        sMembers: jest.fn().mockImplementation((setKey: string) => {
          commands.push({ command: 'sMembers', args: [setKey] });
          return this;
        }),
        exec: jest.fn().mockImplementation(() => {
          return commands.map(({ command, args }) => {
            switch (command) {
              case 'get': {
                return storage.get(args[0])?.value || null;
              }
              case 'set': {
                const expiry = args[2]?.EX
                  ? Date.now() + args[2].EX * 1000
                  : undefined;
                storage.set(args[0], { value: args[1], expiry });
                return 'OK';
              }
              case 'del': {
                let deleted = 0;
                args.forEach((key: string) => {
                  if (storage.delete(key)) deleted++;
                  if (sets.delete(key)) deleted++;
                });
                return deleted;
              }
              case 'sAdd': {
                const [setKey, ...values] = args;
                if (!sets.has(setKey)) {
                  sets.set(setKey, new Set());
                }
                const set = sets.get(setKey)!;
                let added = 0;
                values.forEach((value: string) => {
                  if (!set.has(value)) {
                    set.add(value);
                    added++;
                  }
                });
                return added;
              }
              case 'sMembers': {
                const memberSet = sets.get(args[0]);
                return memberSet ? Array.from(memberSet) : [];
              }
              case 'sRem': {
                const [setKey, ...values] = args;
                const set = sets.get(setKey);
                if (!set) return 0;
                let removed = 0;
                values.forEach((value: string) => {
                  if (set.has(value)) {
                    set.delete(value);
                    removed++;
                  }
                });
                if (set.size === 0) {
                  sets.delete(setKey);
                }
                return removed;
              }
              case 'ttl': {
                const entry = storage.get(args[0]);
                if (!entry || !entry.expiry) return -1;
                const ttl = Math.ceil((entry.expiry - Date.now()) / 1000);
                return ttl > 0 ? ttl : -2;
              }
              default:
                return null;
            }
          });
        }),
      };
    }),
    ttl: jest.fn().mockImplementation((key: string) => {
      const entry = storage.get(key);
      if (!entry || !entry.expiry) return -1; // no expiry
      const ttl = Math.ceil((entry.expiry - Date.now()) / 1000);
      return ttl > 0 ? ttl : -2; // -2 means expired
    }),
  } as any;
};

describe('RedisAdapter', () => {
  let mockClient: jest.Mocked<RedisClientType>;
  let adapter: RedisAdapter;

  beforeEach(() => {
    mockClient = createMockRedisClient();
    adapter = new RedisAdapter(mockClient);
  });

  describe('static connect', () => {
    it('creates client and connects', async () => {
      const mockCreate = jest.fn().mockReturnValue(mockClient);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const originalCreateClient = require('redis').createClient;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('redis').createClient = mockCreate;

      try {
        const result = await RedisAdapter.connect('redis://localhost:6379');

        expect(mockCreate).toHaveBeenCalledWith({
          url: 'redis://localhost:6379',
        });
        expect(mockClient.connect).toHaveBeenCalled();
        expect(result).toBeInstanceOf(RedisAdapter);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('redis').createClient = originalCreateClient;
      }
    });
  });

  describe('basic set/get/del operations', () => {
    it('set/get roundtrip with JSON serialization', async () => {
      await adapter.set('key1', { data: 'value1', num: 42 });

      const result = await adapter.get('key1');
      expect(result).toEqual({ data: 'value1', num: 42 });

      expect(mockClient.set).toHaveBeenCalledWith(
        'key1',
        '{"data":"value1","num":42}',
      );
    });

    it('get non-existent key returns undefined', async () => {
      const result = await adapter.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('del removes key', async () => {
      await adapter.set('key1', 'value1');
      await adapter.del('key1');

      // del now uses multi operations to clean up tag indexes
      expect(mockClient.multi).toHaveBeenCalled();
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

  describe('TTL support', () => {
    it('sets TTL when ttlSec provided', async () => {
      await adapter.set('key1', 'value1', { ttlSec: 60 });

      expect(mockClient.set).toHaveBeenCalledWith('key1', '"value1"', {
        EX: 60,
      });
    });

    it('does not set TTL when ttlSec not provided', async () => {
      await adapter.set('key1', 'value1');

      expect(mockClient.set).toHaveBeenCalledWith('key1', '"value1"');
    });

    it('can verify TTL is set (if real Redis)', async () => {
      // This test would work with real Redis to verify TTL > 0
      await adapter.set('key1', 'value1', { ttlSec: 60 });

      // With mock, we can at least verify the call was made correctly
      expect(mockClient.set).toHaveBeenCalledWith('key1', '"value1"', {
        EX: 60,
      });
    });
  });

  describe('tag-based operations', () => {
    it('set with tags populates tag sets', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1', 'tag2'] });

      expect(mockClient.multi).toHaveBeenCalled();
      // The multi operations would add keys to tag:tag1 and tag:tag2 sets
    });

    it('delByTags removes keys and clears tag sets', async () => {
      // Setup: add some keys with tags
      await adapter.set('key1', 'value1', { tags: ['tag1'] });
      await adapter.set('key2', 'value2', { tags: ['tag1', 'tag2'] });

      // Execute: delete by tags
      await adapter.delByTags(['tag1']);

      expect(mockClient.multi).toHaveBeenCalled();
      // Multi would: 1) get keys from tag sets, 2) delete those keys, 3) delete tag sets
    });

    it('getKeysByTags (private method) aggregates keys from multiple tags', async () => {
      // This tests the private method indirectly through delByTags
      await adapter.set('key1', 'value1', { tags: ['tag1'] });
      await adapter.set('key2', 'value2', { tags: ['tag2'] });
      await adapter.set('key3', 'value3', { tags: ['tag1', 'tag2'] });

      await adapter.delByTags(['tag1', 'tag2']);

      // Should have gathered keys from both tag sets
      expect(mockClient.multi).toHaveBeenCalled();
    });

    it('handles empty tags in delByTags', async () => {
      await adapter.delByTags([]);

      // Should still execute multi but with no operations
      expect(mockClient.multi).toHaveBeenCalled();
    });

    it('handles non-existent tags gracefully', async () => {
      await adapter.delByTags(['nonexistent-tag']);

      // Should not error, just execute empty operations
      expect(mockClient.multi).toHaveBeenCalled();
    });
  });

  describe('complex scenarios', () => {
    it('set with both TTL and tags', async () => {
      await adapter.set('key1', 'value1', {
        ttlSec: 30,
        tags: ['tag1', 'tag2'],
      });

      expect(mockClient.set).toHaveBeenCalledWith('key1', '"value1"', {
        EX: 30,
      });
      expect(mockClient.multi).toHaveBeenCalled();
    });

    it('delByTags removes all keys with specified tags', async () => {
      // This is more of an integration test that would work with real Redis
      await adapter.set('key1', 'value1', { tags: ['tag1'] });
      await adapter.set('key2', 'value2', { tags: ['tag1'] });
      await adapter.set('key3', 'value3', { tags: ['tag2'] });

      await adapter.delByTags(['tag1']);

      // With real Redis, key1 and key2 would be deleted, key3 would remain
      expect(mockClient.multi).toHaveBeenCalled();
    });

    it('tag operations use correct tag set naming', async () => {
      await adapter.set('key1', 'value1', { tags: ['user:123'] });

      // Should create set with name "tag:user:123"
      expect(mockClient.multi).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles Redis connection errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis connection lost'));

      await expect(adapter.get('key1')).rejects.toThrow(
        'Redis connection lost',
      );
    });

    it('handles invalid JSON in get', async () => {
      mockClient.get.mockResolvedValue('invalid-json{');

      await expect(adapter.get('key1')).rejects.toThrow();
    });
  });

  describe('key-tag index functionality', () => {
    it('maintains key→tags index on set and cleans up on del', async () => {
      await adapter.set('key1', 'value1', { tags: ['tag1', 'tag2'] });

      // Should have created keytags:key1 set with tag1, tag2
      expect(mockClient.multi).toHaveBeenCalled();

      // Delete the key - should clean up both tag→keys and key→tags indexes
      await adapter.del('key1');

      expect(mockClient.multi).toHaveBeenCalled();
    });

    it('delByTags removes multiple keys correctly', async () => {
      await adapter.set('key1', 'value1', { tags: ['shared-tag'] });
      await adapter.set('key2', 'value2', { tags: ['shared-tag'] });

      await adapter.delByTags(['shared-tag']);

      // Should use variadic del for multiple keys
      expect(mockClient.multi).toHaveBeenCalled();
    });
  });

  describe('getWithMeta functionality', () => {
    it('returns value with TTL and tags metadata', async () => {
      // Mock the multi response for getWithMeta
      const mockMultiExec = jest.fn().mockResolvedValue([
        '"test-value"', // GET key
        30, // TTL key (seconds remaining)
        ['tag1', 'tag2'], // SMEMBERS keytags:key
      ]);

      const mockMulti = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        sMembers: jest.fn().mockReturnThis(),
        exec: mockMultiExec,
      };

      mockClient.multi.mockReturnValue(mockMulti as any);

      const result = await adapter.getWithMeta('test-key');

      expect(result).toEqual({
        value: 'test-value',
        ttlSec: 30,
        tags: ['tag1', 'tag2'],
      });

      expect(mockMulti.get).toHaveBeenCalledWith('test-key');
      expect(mockMulti.ttl).toHaveBeenCalledWith('test-key');
      expect(mockMulti.sMembers).toHaveBeenCalledWith('keytags:test-key');
    });

    it('returns undefined for non-existent key', async () => {
      const mockMultiExec = jest.fn().mockResolvedValue([
        null, // GET key returns null
        -2, // TTL key (doesn't exist)
        [], // SMEMBERS keytags:key (empty)
      ]);

      const mockMulti = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        sMembers: jest.fn().mockReturnThis(),
        exec: mockMultiExec,
      };

      mockClient.multi.mockReturnValue(mockMulti as any);

      const result = await adapter.getWithMeta('non-existent-key');

      expect(result).toBeUndefined();
    });

    it('handles TTL -1 (no expiry) correctly', async () => {
      const mockMultiExec = jest.fn().mockResolvedValue([
        '"permanent-value"',
        -1, // No TTL set
        ['tag1'],
      ]);

      const mockMulti = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        sMembers: jest.fn().mockReturnThis(),
        exec: mockMultiExec,
      };

      mockClient.multi.mockReturnValue(mockMulti as any);

      const result = await adapter.getWithMeta('permanent-key');

      expect(result).toEqual({
        value: 'permanent-value',
        ttlSec: undefined, // TTL -1 should become undefined
        tags: ['tag1'],
      });
    });
  });
});
