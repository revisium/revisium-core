import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getEnvWithDeprecation,
  getEnvWithDeprecationOrThrow,
  resetDeprecationWarnings,
} from '../deprecated-env';

describe('deprecated-env', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    resetDeprecationWarnings();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('getEnvWithDeprecation', () => {
    it('should return new key value when set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CACHE_ENABLED') {
          return 'true';
        }
        return undefined;
      });

      const result = getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');

      expect(result).toBe('true');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should return deprecated key value and log warning when new key not set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'EXPERIMENTAL_CACHE') {
          return 'true';
        }
        return undefined;
      });

      const result = getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');

      expect(result).toBe('true');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('EXPERIMENTAL_CACHE'),
      );
    });

    it('should prefer new key over deprecated key', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CACHE_ENABLED') {
          return 'new-value';
        }
        if (key === 'EXPERIMENTAL_CACHE') {
          return 'old-value';
        }
        return undefined;
      });

      const result = getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');

      expect(result).toBe('new-value');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should return undefined when neither key is set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');

      expect(result).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log deprecation warning only once per key', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'EXPERIMENTAL_CACHE') {
          return 'true';
        }
        return undefined;
      });

      getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');
      getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');
      getEnvWithDeprecation(mockConfigService, 'CACHE_ENABLED');

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for non-deprecated keys when not set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = getEnvWithDeprecation(
        mockConfigService,
        'SOME_RANDOM_KEY',
      );

      expect(result).toBeUndefined();
    });

    describe.each([
      ['CACHE_ENABLED', 'EXPERIMENTAL_CACHE'],
      ['CACHE_L1_MAX_SIZE', 'EXPERIMENTAL_CACHE_L1_MAX_SIZE'],
      ['CACHE_L2_REDIS_URL', 'EXPERIMENTAL_CACHE_L2_REDIS_URL'],
      ['CACHE_BUS_HOST', 'EXPERIMENTAL_CACHE_REDIS_BUS_HOST'],
      ['CACHE_BUS_PORT', 'EXPERIMENTAL_CACHE_REDIS_BUS_PORT'],
      ['CACHE_DEBUG', 'EXPERIMENTAL_CACHE_DEBUG'],
      ['OAUTH_GOOGLE_CLIENT_SECRET', 'OAUTH_GOOGLE_SECRET_ID'],
      ['OAUTH_GITHUB_CLIENT_SECRET', 'OAUTH_GITHUB_SECRET_ID'],
    ])('deprecated mapping: %s <- %s', (newKey, oldKey) => {
      it(`should fallback from ${newKey} to ${oldKey}`, () => {
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === oldKey) {
            return 'deprecated-value';
          }
          return undefined;
        });

        const result = getEnvWithDeprecation(mockConfigService, newKey);

        expect(result).toBe('deprecated-value');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(oldKey));
      });
    });
  });

  describe('getEnvWithDeprecationOrThrow', () => {
    it('should return value when new key is set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CACHE_BUS_HOST') {
          return 'redis-host';
        }
        return undefined;
      });

      const result = getEnvWithDeprecationOrThrow(
        mockConfigService,
        'CACHE_BUS_HOST',
      );

      expect(result).toBe('redis-host');
    });

    it('should return value when deprecated key is set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'EXPERIMENTAL_CACHE_REDIS_BUS_HOST') {
          return 'redis-host';
        }
        return undefined;
      });

      const result = getEnvWithDeprecationOrThrow(
        mockConfigService,
        'CACHE_BUS_HOST',
      );

      expect(result).toBe('redis-host');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should throw when neither key is set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() =>
        getEnvWithDeprecationOrThrow(mockConfigService, 'CACHE_BUS_HOST'),
      ).toThrow('Missing required environment variable: CACHE_BUS_HOST');
    });
  });
});
