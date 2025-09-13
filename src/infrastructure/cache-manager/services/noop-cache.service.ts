import { Injectable } from '@nestjs/common';
import { CacheLike } from 'src/infrastructure/cache-manager/services/cache.tokens';

@Injectable()
export class NoopCacheService implements CacheLike {
  public async get<T>(
    _key: string,
    _namespace?: string,
  ): Promise<T | undefined> {
    return undefined;
  }

  public async set<T>(
    _key: string,
    _value: T,
    _opts?: { ttlSec?: number; tags?: string[]; namespace?: string },
  ): Promise<void> {}

  public async del(_key: string, _namespace?: string): Promise<void> {}

  public async delByTags(_tags: string[], _namespace?: string): Promise<void> {}
}
