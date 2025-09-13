import { CacheLike } from 'src/infrastructure/cache-manager/services/cache.tokens';

/**
 * Tiny global locator for CacheService.
 * Filled once during module init; read anywhere (incl. decorators).
 * This avoids injecting CacheService into every consumer class.
 */
let _cacheService: CacheLike | null = null;

export function registerCacheService(instance: CacheLike) {
  _cacheService = instance;
}

export function getCacheServiceOrThrow(): CacheLike {
  if (!_cacheService) {
    throw new Error(
      'CacheService is not registered yet. ' +
        'Ensure CacheModule.forRoot() is imported and module initialized before using @CachedMethod.',
    );
  }
  return _cacheService;
}
