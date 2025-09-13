// Mock bentocache imports before importing modules that use them
jest.mock('bentocache', () => ({
  BentoCache: jest.fn(),
  bentostore: jest.fn(() => ({
    useL1Layer: jest.fn().mockReturnThis(),
    useL2Layer: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('bentocache/drivers/memory', () => ({
  memoryDriver: jest.fn(),
}));

jest.mock('bentocache/drivers/redis', () => ({
  redisDriver: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getCacheServiceOrThrow, registerCacheService } from '../cache.locator';
import { RevisiumCacheModule } from '../revisium-cache.module';
import { CACHE_SERVICE } from '../services/cache.tokens';
import { NoopCacheService } from '../services/noop-cache.service';
import {
  BentoCacheFacade,
  createNoopBentoCacheFacade,
} from '../services/bentocache.facade';

describe('CacheBootstrapper and Locator', () => {
  beforeEach(() => {
    // Reset the global locator state before each test
    // We need to clear the internal _cacheService variable
    // Since it's not exported, we'll use a try/catch to detect if it's set
    try {
      getCacheServiceOrThrow();
    } catch {
      // Good, it's not set
    }
  });

  describe('getCacheServiceOrThrow before module init', () => {
    it('throws clear error when not initialized', () => {
      expect(() => getCacheServiceOrThrow()).toThrow(
        'CacheService is not registered yet. Ensure CacheModule.forRoot() is imported and module initialized before using @CachedMethod.',
      );
    });
  });

  describe('after module initialization', () => {
    it('returns NoopCacheService instance when disabled', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({})], // disabled
          }),
          RevisiumCacheModule.forRootAsync(),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: (_key: string) => undefined, // no config values - disabled
        })
        .compile();

      // Module initialization should trigger bootstrapper
      await moduleRef.init();

      const serviceFromDI = moduleRef.get(CACHE_SERVICE);
      const serviceFromLocator = getCacheServiceOrThrow();

      expect(serviceFromDI).toBeInstanceOf(BentoCacheFacade);
      expect(serviceFromLocator).toBe(serviceFromDI); // pointer equality
    });

    it('returns BentoCacheFacade instance when enabled', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({ EXPERIMENTAL_CACHE: '1' })],
          }),
          RevisiumCacheModule.forRootAsync(),
        ],
      }).compile();

      await moduleRef.init();

      const serviceFromDI = moduleRef.get(CACHE_SERVICE);
      const serviceFromLocator = getCacheServiceOrThrow();

      expect(serviceFromDI).toBeInstanceOf(BentoCacheFacade);
      expect(serviceFromLocator).toBe(serviceFromDI); // pointer equality
    });
  });

  describe('manual registration (for testing)', () => {
    it('allows manual registration for testing purposes', () => {
      const mockService = new NoopCacheService();
      registerCacheService(mockService);

      const retrieved = getCacheServiceOrThrow();
      expect(retrieved).toBe(mockService);
    });

    it('can replace service via registerCacheService', () => {
      const service1 = new NoopCacheService();
      const service2 = createNoopBentoCacheFacade();

      registerCacheService(service1);
      expect(getCacheServiceOrThrow()).toBe(service1);

      registerCacheService(service2);
      expect(getCacheServiceOrThrow()).toBe(service2);
    });
  });
});
