import { Inject, Injectable } from '@nestjs/common';
import type { BentoCache, BentoStore } from 'bentocache';
import type {
  DeleteByTagOptions,
  DeleteOptions,
  GetOrSetOptions,
} from 'bentocache/types';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly bento: BentoCache<{ cache: BentoStore }>,
  ) {}

  public async getOrSet<T>(options: GetOrSetOptions<T>) {
    try {
      return await this.bento.getOrSet(options);
    } catch (error: unknown) {
      const cause = (error as { cause?: unknown })?.cause;
      if (
        error instanceof Error &&
        cause instanceof Error &&
        error.message === 'Factory has thrown an error'
      ) {
        throw cause;
      }
      throw error;
    }
  }

  public deleteByTag(options: DeleteByTagOptions) {
    return this.bento.deleteByTag(options);
  }

  public delete(options: DeleteOptions) {
    return this.bento.delete(options);
  }
}
