import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';
import { redisBusDriver, redisDriver } from 'bentocache/drivers/redis';
import { pgBusDriver } from 'src/infrastructure/cache/pg-bus/pg-bus.driver';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { parseBool } from 'src/utils/utils/parse-bool';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from './services/cache.tokens';
import { CACHE_EVENT_HANDLERS } from './handlers';
import Redis from 'ioredis';

@Module({})
export class RevisiumCacheModule {
  static forRootAsync(): DynamicModule {
    return {
      module: RevisiumCacheModule,
      global: true,
      imports: [ConfigModule, CqrsModule],
      providers: [
        {
          provide: CACHE_SERVICE,
          useFactory: async (cfg: ConfigService): Promise<BentoCache<any>> => {
            const logger = new Logger('RevisiumCacheModule');
            const enabled = parseBool(cfg.get<string>('EXPERIMENTAL_CACHE'));

            if (!enabled) {
              logger.warn(
                '⚠️ Cache disabled (NoopBentoCache). Set EXPERIMENTAL_CACHE=1 to enable.',
              );
              return new NoopCacheService() as unknown as BentoCache<any>;
            }

            const l1MaxSize =
              cfg.get<string>('EXPERIMENTAL_CACHE_L1_MAX_SIZE') || undefined;

            if (l1MaxSize) {
              logger.log(`L1_MAX_SIZE: ${l1MaxSize}`);
            }

            const redisUrl =
              cfg.get<string>('EXPERIMENTAL_CACHE_L2_REDIS_URL') || null;

            try {
              let bento: BentoCache<any>;

              if (!redisUrl) {
                const datebaseUrl = cfg.getOrThrow<string>('DATABASE_URL');
                const debug = parseBool(
                  cfg.get<string>('EXPERIMENTAL_CACHE_DEBUG'),
                );

                // L1 only configuration
                bento = new BentoCache({
                  default: 'cache',
                  stores: {
                    cache: bentostore()
                      .useL1Layer(
                        memoryDriver({
                          maxSize: l1MaxSize,
                        }),
                      )
                      .useBus(
                        pgBusDriver({
                          connectionString: datebaseUrl,
                          debug,
                        }),
                      ),
                  },
                });
                logger.log('✅ Cache enabled: L1 only (BentoCache memory).');
              } else {
                const redisBusHost = cfg.getOrThrow<string>(
                  'EXPERIMENTAL_CACHE_REDIS_BUS_HOST',
                );

                if (redisBusHost) {
                  logger.log(`REDIS_BUS_HOST: ${redisBusHost}`);
                }

                const redisBusPort = cfg.getOrThrow<string>(
                  'EXPERIMENTAL_CACHE_REDIS_BUS_PORT',
                );

                if (redisBusPort) {
                  logger.log(`REDIS_BUS_PORT: ${redisBusPort}`);
                }

                // L1 + L2 configuration
                bento = new BentoCache({
                  default: 'cache',
                  stores: {
                    cache: bentostore()
                      .useL1Layer(
                        memoryDriver({
                          maxSize: l1MaxSize,
                        }),
                      )
                      .useL2Layer(
                        redisDriver({
                          connection: new Redis(redisUrl),
                        }),
                      )
                      .useBus(
                        redisBusDriver({
                          connection: {
                            host: redisBusHost,
                            port: parseInt(redisBusPort),
                          },
                          retryQueue: {
                            enabled: true,
                            maxSize: undefined,
                          },
                        }),
                      ),
                  },
                });
                logger.log(
                  `✅ Cache enabled: L1 + L2 (BentoCache + Redis @ ${redisUrl}).`,
                );
              }

              bento.on('bus:message:published', ({ message }) => {
                console.log('bus:message:published', message);
              });

              bento.on('bus:message:received', ({ message }) => {
                console.log('bus:message:received', message);
              });

              return bento;
            } catch (e) {
              const err = e as Error;
              logger.error(
                `❌ BentoCache setup failed (${redisUrl || 'memory'}), using noop fallback.`,
                err?.stack ?? String(err),
              );
              return new NoopCacheService() as unknown as BentoCache<any>;
            }
          },
          inject: [ConfigService],
        },
        CacheService,
        RowCacheService,
        RevisionCacheService,
        AuthCacheService,
        ...CACHE_EVENT_HANDLERS,
      ],
      exports: [
        RowCacheService,
        RevisionCacheService,
        AuthCacheService,
        CacheService,
        CACHE_SERVICE,
      ],
    };
  }
}
