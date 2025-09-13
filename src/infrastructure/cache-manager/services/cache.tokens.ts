export const CACHE_SERVICE = 'CACHE_SERVICE';

export interface CacheLike {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(
    key: string,
    value: T,
    opts?: { ttlSec?: number; tags?: string[] },
  ): Promise<void>;
  del(key: string): Promise<void>;
  delByTags(tags: string[]): Promise<void>;
}
