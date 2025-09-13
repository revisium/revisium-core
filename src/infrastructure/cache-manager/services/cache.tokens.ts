export const CACHE_SERVICE = 'CACHE_SERVICE';

export interface CacheLike {
  get<T>(key: string, namespace?: string): Promise<T | undefined>;
  set<T>(
    key: string,
    value: T,
    opts?: { ttlSec?: number; tags?: string[]; namespace?: string },
  ): Promise<void>;
  del(key: string, namespace?: string): Promise<void>;
  delByTags(tags: string[], namespace?: string): Promise<void>;
}
