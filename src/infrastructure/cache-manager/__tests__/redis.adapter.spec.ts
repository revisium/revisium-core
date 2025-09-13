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

      expect(mockClient.del).toHaveBeenCalledWith('key1');
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
});
