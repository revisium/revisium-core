import { LRUCache } from 'lru-cache';
import { CacheAdapter } from './cache.adapter';

type Entry<T> = { value: T; tags?: Set<string>; expiresAt?: number };

export class InMemoryAdapter implements CacheAdapter {
  private cache = new LRUCache<string, Entry<unknown>>({ max: 5000 });
  private tagIndex = new Map<string, Set<string>>();

  public async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.del(key);
      return undefined;
    }

    return entry.value as T;
  }

  public async set<T>(
    key: string,
    value: T,
    opts?: { ttlSec?: number; tags?: string[] },
  ): Promise<void> {
    const expiresAt = opts?.ttlSec
      ? Date.now() + opts.ttlSec * 1000
      : undefined;

    const tags = new Set(opts?.tags ?? []);
    this.cache.set(key, { value, tags, expiresAt });

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }

      this.tagIndex.get(tag)?.add(key);
    }
  }

  public async del(key: string): Promise<void> {
    const entry = this.cache.get(key);

    if (entry?.tags) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }

    this.cache.delete(key);
  }

  public async delByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);

      if (!keys) {
        continue;
      }

      for (const key of keys) {
        this.cache.delete(key);
      }

      this.tagIndex.delete(tag);
    }
  }
}
