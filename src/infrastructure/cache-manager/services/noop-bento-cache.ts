import { CacheLike } from '../cache.locator';

/**
 * Noop implementation of BentoCache interface
 * Used when caching is disabled
 */
export class NoopBentoCache implements CacheLike {
  async get(_options: { key: string }): Promise<any | undefined> {
    return undefined;
  }

  async set(_options: {
    key: string;
    value: any;
    ttl?: number;
    tags?: string[];
  }): Promise<false> {
    // No-op
    return false;
  }

  async deleteByTag(_options: { tags: string[] }): Promise<void> {
    // No-op
  }

  namespace(_name: string): CacheLike {
    return new NoopBentoCache();
  }
}
