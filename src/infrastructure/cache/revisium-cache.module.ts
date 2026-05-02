import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { pgBusDriver } from 'src/infrastructure/cache/pg-bus/pg-bus.driver';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { CacheManagementService } from 'src/infrastructure/cache/services/cache-management.service';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { ProjectCacheService } from 'src/infrastructure/cache/services/project-cache.service';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { parseBool } from 'src/utils/utils/parse-bool';
import {
  getEnvWithDeprecation,
  getEnvWithDeprecationOrThrow,
} from 'src/utils/env';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from './services/cache.tokens';
import { CACHE_EVENT_HANDLERS } from './handlers';
import Redis from 'ioredis';
import * as promClient from 'prom-client';

// Dedicated registry for bentocache metrics — avoids "already registered" on double module init
export const bentocacheRegistry = new promClient.Registry();

// Singleton guard — forRootAsync factory runs per import, but we only create BentoCache once
let bentoCachePromise: Promise<any> | null = null;

const CACHE_KEY_GROUPS: [RegExp, string][] = [
  // Data keys
  [/^revision:get-rows:/, 'row-queries'],
  [/^revision:revision:/, 'revisions'],
  [/^revision:/, 'row-data'],
  [/^auth:role:permissions:/, 'auth-roles'],
  [/^auth:check-/, 'auth-checks'],
  [/^auth:api-key:/, 'auth-api-keys'],
  [/^billing:sub:/, 'billing-subscriptions'],
  [/^billing:usage:/, 'billing-usage'],
  [/^billing:rev-org:/, 'billing-lookups'],
  // Internal tag keys (___bc:t:*) — aggregate to avoid unbounded cardinality
  [/^___bc:t:auth-relatives$/, 'tag:auth'],
  [/^___bc:t:dictionaries$/, 'tag:auth'],
  [/^___bc:t:user-permissions-/, 'tag:user-permissions'],
  [/^___bc:t:org-permissions-/, 'tag:org-permissions'],
  [/^___bc:t:project-permissions-/, 'tag:project-permissions'],
  [/^___bc:t:revision-relatives-/, 'tag:revision-relatives'],
  [/^___bc:t:table-relatives-/, 'tag:table-relatives'],
  [/^___bc:t:table-get-rows-/, 'tag:table-get-rows'],
  [/^___bc:t:revision-/, 'tag:revisions'],
  [/^___bc:t:billing-org-/, 'tag:billing'],
  [/^___bc:t:billing-usage-/, 'tag:billing'],
  [/^___bc:t:/, 'tag:other'],
];

// Dynamic imports for ESM compatibility (requires --experimental-require-module in Node.js 22+)
async function loadBentoCacheCore() {
  const { BentoCache, bentostore } = await import('bentocache');
  const { memoryDriver } = await import('bentocache/drivers/memory');
  const { prometheusPlugin } = await import('@bentocache/plugin-prometheus');
  return { BentoCache, bentostore, memoryDriver, prometheusPlugin };
}

async function loadBentoCacheRedis() {
  const { redisBusDriver, redisDriver } =
    await import('bentocache/drivers/redis');
  return { redisBusDriver, redisDriver };
}

async function createBentoCache(cfg: ConfigService): Promise<any> {
  const logger = new Logger('RevisiumCacheModule');
  const enabled = parseBool(getEnvWithDeprecation(cfg, 'CACHE_ENABLED'));

  if (!enabled) {
    logger.warn(
      'Cache disabled (NoopBentoCache). Set CACHE_ENABLED=1 to enable.',
    );
    return new NoopCacheService() as any;
  }

  const l1MaxSize = getEnvWithDeprecation(cfg, 'CACHE_L1_MAX_SIZE');

  if (l1MaxSize) {
    logger.log(`L1_MAX_SIZE: ${l1MaxSize}`);
  }

  const redisUrl = getEnvWithDeprecation(cfg, 'CACHE_L2_REDIS_URL') || null;

  try {
    let bento: any;

    if (redisUrl) {
      const redisBusHost = getEnvWithDeprecationOrThrow<string>(
        cfg,
        'CACHE_BUS_HOST',
      );

      if (redisBusHost) {
        logger.log(`CACHE_BUS_HOST: ${redisBusHost}`);
      }

      const redisBusPort = getEnvWithDeprecationOrThrow<string>(
        cfg,
        'CACHE_BUS_PORT',
      );

      if (redisBusPort) {
        logger.log(`CACHE_BUS_PORT: ${redisBusPort}`);
      }

      const { BentoCache, bentostore, memoryDriver, prometheusPlugin } =
        await loadBentoCacheCore();
      const { redisBusDriver, redisDriver } = await loadBentoCacheRedis();

      bento = new BentoCache({
        default: 'cache',
        plugins: [
          prometheusPlugin({
            prefix: 'bentocache',
            registry: bentocacheRegistry,
            keyGroups: CACHE_KEY_GROUPS,
          }),
        ],
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
                  port: Number.parseInt(redisBusPort),
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
    } else {
      const databaseUrl = cfg.getOrThrow<string>('DATABASE_URL');
      const debug = parseBool(getEnvWithDeprecation(cfg, 'CACHE_DEBUG'));

      const { BentoCache, bentostore, memoryDriver, prometheusPlugin } =
        await loadBentoCacheCore();

      bento = new BentoCache({
        default: 'cache',
        plugins: [
          prometheusPlugin({
            prefix: 'bentocache',
            registry: bentocacheRegistry,
            keyGroups: CACHE_KEY_GROUPS,
          }),
        ],
        stores: {
          cache: bentostore()
            .useL1Layer(
              memoryDriver({
                maxSize: l1MaxSize,
              }),
            )
            .useBus(
              pgBusDriver({
                connectionString: databaseUrl,
                debug,
              }),
            ),
        },
      });
      logger.log('✅ Cache enabled: L1 only (BentoCache memory).');
    }

    return bento;
  } catch (e) {
    const err = e as Error;
    logger.error(
      `❌ BentoCache setup failed (${redisUrl || 'memory'}), using noop fallback.`,
      err?.stack ?? String(err),
    );
    return new NoopCacheService() as any;
  }
}

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
          useFactory: (cfg: ConfigService): Promise<any> => {
            if (bentoCachePromise) {
              return bentoCachePromise;
            }
            bentoCachePromise = createBentoCache(cfg);
            return bentoCachePromise;
          },
          inject: [ConfigService],
        },
        CacheService,
        CacheManagementService,
        RowCacheService,
        RevisionCacheService,
        AuthCacheService,
        ProjectCacheService,
        ...CACHE_EVENT_HANDLERS,
      ],
      exports: [
        RowCacheService,
        RevisionCacheService,
        AuthCacheService,
        ProjectCacheService,
        CacheService,
        CacheManagementService,
        CACHE_SERVICE,
      ],
    };
  }
}
