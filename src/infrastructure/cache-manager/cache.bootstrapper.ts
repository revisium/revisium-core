import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CACHE_SERVICE } from './services/cache.tokens';
import { CacheLike, registerCacheService } from './cache.locator';

/**
 * On app/module init, capture the CacheService into the global locator.
 * Keeps DI pure in most places while allowing decorators to access the service.
 */
@Injectable()
export class CacheBootstrapper implements OnModuleInit {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: CacheLike,
  ) {}

  onModuleInit() {
    registerCacheService(this.cache);
  }
}
