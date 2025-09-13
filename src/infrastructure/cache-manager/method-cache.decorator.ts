import 'reflect-metadata';
import { getCacheServiceOrThrow } from './cache.locator';

// Options for a specific cached method
export type MethodCacheOptions<Args = any, Ret = any> = {
  keyPrefix: string; // e.g., 'role:permissions'
  makeKey?: (args: Args[]) => string; // defaults to JSON.stringify(args)
  makeTags?: (args: Args[], result?: Ret) => string[]; // defaults to []
  ttlSec?: number; // 0 = no TTL (persist until explicit invalidation)
};

/**
 * @CachedMethod wraps an async method and caches its result.
 * It resolves CacheService from a global locator populated at module init,
 */
export function CachedMethod<Args = any, Ret = any>(
  options: MethodCacheOptions<Args, Ret>,
) {
  const {
    keyPrefix,
    makeKey = (args) => JSON.stringify(args),
    makeTags = () => [],
    ttlSec = 3600,
  } = options;

  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const orig = descriptor.value;
    descriptor.value = async function (...args: Args[]) {
      const cache = getCacheServiceOrThrow();

      const key = `${keyPrefix}:${makeKey(args)}`;
      const cached = await cache.get<Ret>(key);

      if (cached !== undefined) {
        return cached;
      }

      const result: Ret = await orig.apply(this, args);

      if (result === undefined) {
        return result;
      }

      const tags = makeTags(args, result);
      await cache.set(key, result, { ttlSec, tags });
      return result;
    };
    return descriptor;
  };
}
