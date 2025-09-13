import { Injectable, Optional } from '@nestjs/common';
import { CacheLike } from 'src/infrastructure/cache-manager/services/cache.tokens';
import { CacheAdapter } from '../adapters/cache.adapter';
import { InMemoryAdapter } from '../adapters/in-memory.adapter';

@Injectable()
export class CacheService implements CacheLike {
  constructor(
    private readonly l1: InMemoryAdapter,
    @Optional() private readonly l2?: CacheAdapter,
  ) {}

  public async get<T>(key: string): Promise<T | undefined> {
    const v1 = await this.l1.get<T>(key);

    if (v1 !== undefined) {
      return v1;
    }

    if (this.l2) {
      const v2 = await this.l2.get<T>(key);

      if (v2 !== undefined) {
        await this.l1.set(key, v2);
        return v2;
      }
    }

    return undefined;
  }

  public async set<T>(
    key: string,
    value: T,
    opts?: { ttlSec?: number; tags?: string[] },
  ): Promise<void> {
    await this.l1.set(key, value, opts);

    if (this.l2) {
      await this.l2.set(key, value, opts);
    }
  }

  public async del(key: string) {
    await this.l1.del(key);

    if (this.l2) {
      await this.l2.del(key);
    }
  }

  public async delByTags(tags: string[]) {
    await this.l1.delByTags(tags);

    if (this.l2) {
      await this.l2.delByTags(tags);
    }
  }
}
