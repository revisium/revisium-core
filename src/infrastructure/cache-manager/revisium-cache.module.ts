import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';
import { redisDriver } from 'bentocache/drivers/redis';
import { CacheLike } from 'src/infrastructure/cache-manager/cache.locator';
import { parseBool } from 'src/utils/utils/parse-bool';
import { CacheBootstrapper } from './cache.bootstrapper';
import { NoopBentoCache } from './services/noop-bento-cache';
import { CACHE_SERVICE } from './services/cache.tokens';
import Redis from 'ioredis';

@Module({})
export class RevisiumCacheModule {
  static forRootAsync(): DynamicModule {
    return {
      module: RevisiumCacheModule,
      global: true,
      imports: [ConfigModule],
      providers: [
        {
          provide: CACHE_SERVICE,
          useFactory: async (cfg: ConfigService): Promise<CacheLike> => {
            const logger = new Logger('RevisiumCacheModule');
            const enabled = parseBool(cfg.get<string>('EXPERIMENTAL_CACHE'));

            if (!enabled) {
              logger.warn(
                '⚠️ Cache disabled (NoopBentoCache). Set EXPERIMENTAL_CACHE=1 to enable.',
              );
              return new NoopBentoCache();
            }

            const redisUrl =
              cfg.get<string>('EXPERIMENTAL_CACHE_L2_REDIS_URL') || null;

            try {
              let bento: BentoCache<any>;

              if (!redisUrl) {
                // L1 only configuration
                bento = new BentoCache({
                  default: 'cache',
                  stores: {
                    cache: bentostore().useL1Layer(
                      memoryDriver({
                        maxSize: 5000, // Same as our old LRU cache
                      }),
                    ),
                  },
                });
                logger.log('✅ Cache enabled: L1 only (BentoCache memory).');
              } else {
                // L1 + L2 configuration
                bento = new BentoCache({
                  default: 'cache',
                  stores: {
                    cache: bentostore()
                      .useL1Layer(
                        memoryDriver({
                          maxSize: 5000,
                        }),
                      )
                      .useL2Layer(
                        redisDriver({
                          connection: new Redis(redisUrl),
                        }),
                      ),
                  },
                });
                logger.log(
                  `✅ Cache enabled: L1 + L2 (BentoCache + Redis @ ${redisUrl}).`,
                );
              }

              return bento;
            } catch (e) {
              const err = e as Error;
              logger.error(
                `❌ BentoCache setup failed (${redisUrl || 'memory'}), using noop fallback.`,
                err?.stack ?? String(err),
              );
              return new NoopBentoCache();
            }
          },
          inject: [ConfigService],
        },
        CacheBootstrapper,
      ],
      exports: [CACHE_SERVICE],
    };
  }
}
