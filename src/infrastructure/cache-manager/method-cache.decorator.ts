import 'reflect-metadata';
import { getCacheServiceOrThrow } from './cache.locator';

// Options for a specific cached method - matches BentoCache .set signature
export type MethodCacheOptions<Args = any, Ret = any> = {
  key: string; // The cache key (replaces keyPrefix + makeKey)
  ttl?: number; // TTL in milliseconds (matches BentoCache)
  tags?: string[]; // Cache tags for invalidation
  namespace?: string; // BentoCache namespace for isolation
  makeKey?: (args: Args[]) => string; // Optional dynamic key generation
  makeTags?: (args: Args[], result?: Ret) => string[]; // Optional dynamic tags generation
};

/**
 * @CachedMethod wraps an async method and caches its result.
 * It resolves CacheService from a global locator populated at module init,
 */
export function CachedMethod<Args = any, Ret = any>(
  options: MethodCacheOptions<Args, Ret>,
) {
  const {
    key: baseKey,
    ttl,
    tags: staticTags = [],
    namespace,
    makeKey = (args) => JSON.stringify(args),
    makeTags = () => [],
  } = options;

  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const orig = descriptor.value;
    descriptor.value = async function (...args: Args[]) {
      const cache = getCacheServiceOrThrow();

      // Generate cache key - use baseKey + dynamic key if makeKey provided
      const key = makeKey ? `${baseKey}:${makeKey(args)}` : baseKey;

      // Get the appropriate driver (namespaced or default)
      const driver = namespace ? cache.namespace(namespace) : cache;

      const cached = await driver.get({ key });

      if (cached !== undefined) {
        return cached;
      }

      const result: Ret = await orig.apply(this, args);

      if (result === undefined) {
        return result;
      }

      // Generate tags - combine static + dynamic
      const dynamicTags = makeTags(args, result);
      const allTags = [...staticTags, ...dynamicTags];

      // Use BentoCache API
      await driver.set({
        key,
        value: result,
        ttl, // Already in milliseconds
        tags: allTags.length > 0 ? allTags : undefined,
      });
      return result;
    };
    return descriptor;
  };
}
