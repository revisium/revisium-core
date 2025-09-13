import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RevisiumCacheModule } from '../revisium-cache.module';
import { CACHE_SERVICE } from '../services/cache.tokens';
import { NoopCacheService } from '../services/noop-cache.service';
import { CacheService } from '../services/cache.service';

describe('RevisiumCacheModule modes', () => {
  let logSpy: jest.SpyInstance,
    warnSpy: jest.SpyInstance,
    errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disabled (default) → Noop + warn', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({})], // no flags
        }),
        RevisiumCacheModule.forRootAsync(),
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (_key: string) => undefined, // no config values
      })
      .compile();

    // Initialize the module to trigger the factory
    await moduleRef.init();

    const svc = moduleRef.get(CACHE_SERVICE);
    expect(svc).toBeInstanceOf(NoopCacheService);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cache disabled'),
    );
  });

  it('L1 only → CacheService + log', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ EXPERIMENTAL_CACHE: '1' })],
        }),
        RevisiumCacheModule.forRootAsync(),
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'EXPERIMENTAL_CACHE') return '1';
          if (key === 'EXPERIMENTAL_CACHE_L2_REDIS_URL') return null;
          return undefined;
        },
      })
      .compile();

    await moduleRef.init();

    const svc = moduleRef.get(CACHE_SERVICE);
    expect(svc).toBeInstanceOf(CacheService);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('L1 only'));
  });

  it('L1+L2 attempt with Redis URL → would connect if Redis available', async () => {
    // Note: This test assumes Redis is NOT running, so it will fallback
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              EXPERIMENTAL_CACHE: 'true',
              EXPERIMENTAL_CACHE_L2_REDIS_URL: 'redis://localhost:6379/0',
            }),
          ],
        }),
        RevisiumCacheModule.forRootAsync(),
      ],
    }).compile();

    const svc = moduleRef.get(CACHE_SERVICE);
    expect(svc).toBeInstanceOf(CacheService);
    // This will either log L1+L2 success or error+L1 fallback
    expect(logSpy).toHaveBeenCalled();
  });

  it('Redis failure → fallback to L1 + error', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              EXPERIMENTAL_CACHE: '1',
              EXPERIMENTAL_CACHE_L2_REDIS_URL: 'redis://127.0.0.1:0/0', // invalid port
            }),
          ],
        }),
        RevisiumCacheModule.forRootAsync(),
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'EXPERIMENTAL_CACHE') return '1';
          if (key === 'EXPERIMENTAL_CACHE_L2_REDIS_URL')
            return 'redis://127.0.0.1:0/0';
          return undefined;
        },
      })
      .compile();

    await moduleRef.init();

    const svc = moduleRef.get(CACHE_SERVICE);
    expect(svc).toBeInstanceOf(CacheService);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis connect failed'),
      expect.anything(),
    );
    // Service should still be created (fallback to L1 only)
    // but Redis error was logged
  });

  describe('parseBool cases via config', () => {
    const testCases = [
      { input: '1', expected: true },
      { input: 'true', expected: true },
      { input: 'TRUE', expected: true },
      { input: 'on', expected: true },
      { input: 'ON', expected: true },
      { input: 'yes', expected: true },
      { input: 'YES', expected: true },
      { input: '0', expected: false },
      { input: 'false', expected: false },
      { input: 'off', expected: false },
      { input: 'no', expected: false },
      { input: 'random', expected: false },
      { input: '', expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`parseBool("${input}") → ${expected} (via cache enablement)`, async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              load: [() => ({ EXPERIMENTAL_CACHE: input })],
            }),
            RevisiumCacheModule.forRootAsync(),
          ],
        })
          .overrideProvider(ConfigService)
          .useValue({
            get: (key: string) => {
              if (key === 'EXPERIMENTAL_CACHE') return input;
              if (key === 'EXPERIMENTAL_CACHE_L2_REDIS_URL') return null;
              return undefined;
            },
          })
          .compile();

        await moduleRef.init();

        const svc = moduleRef.get(CACHE_SERVICE);
        if (expected) {
          expect(svc).toBeInstanceOf(CacheService);
        } else {
          expect(svc).toBeInstanceOf(NoopCacheService);
        }
      });
    });

    it('parseBool(undefined) → false (no EXPERIMENTAL_CACHE)', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({})], // no EXPERIMENTAL_CACHE
          }),
          RevisiumCacheModule.forRootAsync(),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: (_key: string) => undefined, // no config values
        })
        .compile();

      await moduleRef.init();

      const svc = moduleRef.get(CACHE_SERVICE);
      expect(svc).toBeInstanceOf(NoopCacheService);
    });
  });
});
