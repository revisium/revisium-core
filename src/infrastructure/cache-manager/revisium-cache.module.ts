import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheBootstrapper } from './cache.bootstrapper';
import { InMemoryAdapter } from './adapters/in-memory.adapter';
import { RedisAdapter } from './adapters/redis.adapter';
import { CacheService } from './services/cache.service';
import { NoopCacheService } from './services/noop-cache.service';
import { CACHE_SERVICE, CacheLike } from './services/cache.tokens';

function parseBool(v?: string | null): boolean {
  if (!v) return false;
  return ['1', 'true', 'on', 'yes'].includes(String(v).toLowerCase());
}

@Module({})
export class RevisiumCacheModule {
  static forRootAsync(): DynamicModule {
    return {
      module: RevisiumCacheModule,
      global: true,
      imports: [ConfigModule],
      providers: [
        InMemoryAdapter,
        {
          provide: CACHE_SERVICE,
          useFactory: async (
            cfg: ConfigService,
            l1: InMemoryAdapter,
          ): Promise<CacheLike> => {
            const logger = new Logger('RevisiumCacheModule');
            const enabled = parseBool(cfg.get<string>('EXPERIMENTAL_CACHE'));

            if (!enabled) {
              logger.warn(
                '⚠️ Cache disabled (NoopCacheService). Set EXPERIMENTAL_CACHE=1 to enable.',
              );
              return new NoopCacheService();
            }

            const redisUrl =
              cfg.get<string>('EXPERIMENTAL_CACHE_L2_REDIS_URL') || null;
            if (!redisUrl) {
              logger.log('✅ Cache enabled: L1 only (InMemoryAdapter).');
              return new CacheService(l1);
            }

            try {
              const l2 = await RedisAdapter.connect(redisUrl);
              logger.log(`✅ Cache enabled: L1 + L2 (Redis @ ${redisUrl}).`);
              return new CacheService(l1, l2);
            } catch (e) {
              logger.error(
                `❌ Redis connect failed (${redisUrl}), fallback to L1 only.`,
                e as any,
              );
              return new CacheService(l1);
            }
          },
          inject: [ConfigService, InMemoryAdapter],
        },
        CacheBootstrapper,
      ],
      exports: [CACHE_SERVICE],
    };
  }
}
