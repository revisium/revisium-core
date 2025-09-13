import { BentoCache } from 'bentocache';
import { CacheLike } from './cache.tokens';

export type SetOptions = {
  ttlSec?: number;
  tags?: string[];
  namespace?: string;
};

/**
 * Facade that implements CacheLike interface over BentoCache
 * Provides compatibility layer for existing cache interface
 */
export class BentoCacheFacade implements CacheLike {
  constructor(private readonly bento: BentoCache<any> | null = null) {}

  async get<T>(key: string, namespace?: string): Promise<T | undefined> {
    if (!this.bento) {
      return undefined; // noop mode
    }

    try {
      const driver = namespace ? this.bento.namespace(namespace) : this.bento;
      return await driver.get({ key });
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, opts?: SetOptions): Promise<void> {
    if (!this.bento) {
      return; // noop mode
    }

    try {
      const driver = opts?.namespace
        ? this.bento.namespace(opts.namespace)
        : this.bento;

      await driver.set({
        key,
        value,
        ttl: opts?.ttlSec ? opts.ttlSec * 1000 : undefined, // Convert seconds to milliseconds
        tags: opts?.tags,
      });
    } catch {
      // Silently ignore errors in cache operations
    }
  }

  async del(key: string, namespace?: string): Promise<void> {
    if (!this.bento) {
      return; // noop mode
    }

    try {
      const driver = namespace ? this.bento.namespace(namespace) : this.bento;
      await driver.delete({ key });
    } catch {
      // Silently ignore errors in cache operations
    }
  }

  async delByTags(tags: string[], namespace?: string): Promise<void> {
    if (!this.bento) {
      return; // noop mode
    }

    try {
      const driver = namespace ? this.bento.namespace(namespace) : this.bento;

      // Use BentoCache tag invalidation - one by one since API uses deleteByTag (singular)
      for (const tag of tags) {
        await driver.deleteByTag({ tags: [tag] });
      }
    } catch {
      // Silently ignore errors in cache operations
    }
  }
}

/**
 * Creates a no-op BentoCache facade that doesn't cache anything
 * Used when EXPERIMENTAL_CACHE is disabled
 */
export function createNoopBentoCacheFacade(): BentoCacheFacade {
  return new BentoCacheFacade(null);
}
