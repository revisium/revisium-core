import { Injectable } from '@nestjs/common';
import { CacheLike } from 'src/infrastructure/cache-manager/services/cache.tokens';

@Injectable()
export class NoopCacheService implements CacheLike {
  public async get<T>(_key: string): Promise<T | undefined> {
    return undefined;
  }

  public async set<T>(
    _key: string,
    _value: T,
    _opts?: { ttlSec?: number; tags?: string[] },
  ): Promise<void> {}

  public async del(_key: string): Promise<void> {}

  public async delByTags(_tags: string[]): Promise<void> {}
}
