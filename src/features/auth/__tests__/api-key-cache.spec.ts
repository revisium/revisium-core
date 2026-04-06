import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import {
  AUTH_CACHE_KEYS,
  AUTH_CACHE_CONFIG,
  AUTH_CACHE_TAGS,
} from 'src/infrastructure/cache/constants/auth-cache.constants';

describe('AuthCacheService - API key caching', () => {
  let authCache: AuthCacheService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    cacheService = {
      getOrSet: jest.fn(),
      deleteByTag: jest.fn(),
      delete: jest.fn(),
    } as any;

    authCache = new AuthCacheService(cacheService);
  });

  describe('apiKeyByHash', () => {
    it('should call getOrSet with correct key and TTL', async () => {
      const keyHash = 'abc123hash';
      const factory = jest.fn().mockResolvedValue({ id: 'key-1' });
      cacheService.getOrSet.mockResolvedValue({ id: 'key-1' });

      await authCache.apiKeyByHash(keyHash, factory);

      expect(cacheService.getOrSet).toHaveBeenCalledWith({
        key: AUTH_CACHE_KEYS.API_KEY_BY_HASH(keyHash),
        ttl: AUTH_CACHE_CONFIG.API_KEY_TTL,
        tags: [AUTH_CACHE_TAGS.AUTH_RELATIVES],
        factory,
      });
    });

    it('should return cached value on cache hit', async () => {
      const cached = { id: 'key-1', name: 'Cached Key' };
      cacheService.getOrSet.mockResolvedValue(cached);

      const result = await authCache.apiKeyByHash('hash', jest.fn());

      expect(result).toBe(cached);
    });

    it('should return factory result on cache miss', async () => {
      const apiKey = { id: 'key-2', name: 'Fresh Key' };
      const factory = jest.fn().mockResolvedValue(apiKey);
      cacheService.getOrSet.mockImplementation(async (opts: any) =>
        opts.factory(),
      );

      const result = await authCache.apiKeyByHash('hash', factory);

      expect(result).toEqual(apiKey);
      expect(factory).toHaveBeenCalled();
    });

    it('should return null when factory returns null (key not found)', async () => {
      const factory = jest.fn().mockResolvedValue(null);
      cacheService.getOrSet.mockImplementation(async (opts: any) =>
        opts.factory(),
      );

      const result = await authCache.apiKeyByHash('hash', factory);

      expect(result).toBeNull();
    });
  });

  describe('invalidateApiKeyByHash', () => {
    it('should delete the cache entry by key name', async () => {
      const keyHash = 'abc123hash';

      await authCache.invalidateApiKeyByHash(keyHash);

      expect(cacheService.delete).toHaveBeenCalledWith({
        key: AUTH_CACHE_KEYS.API_KEY_BY_HASH(keyHash),
      });
    });
  });

  describe('invalidateAllAuthCaches', () => {
    it('should clear API key caches via AUTH_RELATIVES tag', async () => {
      await authCache.invalidateAllAuthCaches();

      expect(cacheService.deleteByTag).toHaveBeenCalledWith({
        tags: [AUTH_CACHE_TAGS.AUTH_RELATIVES],
      });
    });
  });
});

describe('AUTH_CACHE_KEYS', () => {
  it('should generate correct API key cache key', () => {
    expect(AUTH_CACHE_KEYS.API_KEY_BY_HASH('abc123')).toBe(
      'auth:api-key:abc123',
    );
  });
});

describe('AUTH_CACHE_CONFIG', () => {
  it('should have 5m TTL for API keys', () => {
    expect(AUTH_CACHE_CONFIG.API_KEY_TTL).toBe('5m');
  });
});
