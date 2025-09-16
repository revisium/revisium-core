import { Inject, Injectable } from '@nestjs/common';
import { BentoCache, BentoStore } from 'bentocache';
import { DeleteByTagOptions, GetOrSetOptions } from 'bentocache/types';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly bento: BentoCache<{ cache: BentoStore }>,
  ) {}

  public getOrSet<T>(options: GetOrSetOptions<T>) {
    return this.bento.getOrSet(options);
  }

  public deleteByTag(options: DeleteByTagOptions) {
    return this.bento.deleteByTag(options);
  }
}
