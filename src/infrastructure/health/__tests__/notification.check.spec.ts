import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { NotificationCheck } from 'src/infrastructure/health/notification.check';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('NotificationCheck', () => {
  describe('available', () => {
    it('should return true when mode is microservice', () => {
      mockConfig();

      expect(service.available).toBe(true);
    });

    it('should return false when Redis configuration is missing', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ENDPOINT_HOST') return '127.0.0.1';
        return undefined;
      });

      expect(service.available).toBe(false);
    });

    it('should return false when mode is not microservice', async () => {
      mockConfig();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationCheck,
          { provide: ConfigService, useValue: configService },
          { provide: HealthIndicatorService, useValue: healthIndicator },
          { provide: APP_OPTIONS_TOKEN, useValue: mockAppOptionsMonolith },
        ],
      }).compile();

      const check = module.get<NotificationCheck>(NotificationCheck);
      expect(check.available).toBe(false);
    });
  });

  describe('check', () => {
    const PORT_KEY = 'ENDPOINT_PORT';
    const HOST_KEY = 'ENDPOINT_HOST';

    it('should throw if ENDPOINT_PORT env var is not set', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === PORT_KEY) return undefined;
      });

      await expect(service.check()).rejects.toThrow(
        `Environment variable not found: ${PORT_KEY}`,
      );
    });

    it('should throw if ENDPOINT_HOST env var is not set', async () => {
      (configService.get as jest.Mock)
        .mockImplementationOnce(() => '6379')
        .mockImplementationOnce(() => undefined);

      await expect(service.check()).rejects.toThrow(
        `Environment variable not found: ${HOST_KEY}`,
      );
    });

    it('should ping Redis and return an up result', async () => {
      mockConfig();

      const result = await service.check();

      expect(RedisMock).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 6380,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        retryStrategy: expect.any(Function),
      });
      expect(redisClient.connect).toHaveBeenCalledTimes(1);
      expect(redisClient.ping).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ notifications: { status: 'up' } });
    });

    it('should reuse the Redis client across checks', async () => {
      mockConfig();
      redisClient.connect.mockImplementation(async () => {
        redisClient.status = 'ready';
      });

      await service.check();
      await service.check();

      expect(RedisMock).toHaveBeenCalledTimes(1);
      expect(redisClient.connect).toHaveBeenCalledTimes(1);
      expect(redisClient.ping).toHaveBeenCalledTimes(2);
    });

    it('should wait for an in-flight Redis connection before concurrent pings', async () => {
      mockConfig();

      let resolveConnect: () => void;
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = () => {
          redisClient.status = 'ready';
          resolve();
        };
      });

      redisClient.connect.mockReturnValue(connectPromise);
      redisClient.ping.mockImplementation(async () => {
        if (redisClient.status !== 'ready') {
          throw new Error('Redis is not ready');
        }
        return 'PONG';
      });

      const firstCheck = service.check();
      await Promise.resolve();

      redisClient.status = 'connecting';

      const secondCheck = service.check();
      await Promise.resolve();

      expect(redisClient.connect).toHaveBeenCalledTimes(1);
      expect(redisClient.ping).not.toHaveBeenCalled();

      resolveConnect!();

      await expect(Promise.all([firstCheck, secondCheck])).resolves.toEqual([
        { notifications: { status: 'up' } },
        { notifications: { status: 'up' } },
      ]);
      expect(redisClient.ping).toHaveBeenCalledTimes(2);
    });

    it('should return a down result when Redis ping fails', async () => {
      mockConfig();
      redisClient.ping.mockRejectedValue(new Error('Redis unavailable'));

      const result = await service.check();

      expect(result).toEqual({
        notifications: {
          status: 'down',
          message: 'Redis unavailable',
        },
      });
    });

    it('should close the Redis client on module destroy', async () => {
      mockConfig();
      await service.check();

      await service.onModuleDestroy();

      expect(redisClient.quit).toHaveBeenCalledTimes(1);
      expect(redisClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect the Redis client if graceful quit fails', async () => {
      mockConfig();
      redisClient.quit.mockRejectedValue(new Error('quit failed'));
      await service.check();

      await service.onModuleDestroy();

      expect(redisClient.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  let service: NotificationCheck;
  let configService: Partial<ConfigService>;
  let healthIndicator: HealthIndicatorService;
  let redisClient: {
    status: string;
    connect: jest.Mock<Promise<void>, []>;
    ping: jest.Mock<Promise<string>, []>;
    quit: jest.Mock<Promise<string>, []>;
    disconnect: jest.Mock<void, []>;
    on: jest.Mock;
  };

  const RedisMock = Redis as unknown as jest.Mock;
  const mockAppOptionsMicroservice: AppOptions = { mode: 'microservice' };
  const mockAppOptionsMonolith: AppOptions = { mode: 'monolith' };

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };
    healthIndicator = new HealthIndicatorService();
    redisClient = {
      status: 'wait',
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
      on: jest.fn(),
    };
    RedisMock.mockClear();
    RedisMock.mockImplementation(() => redisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationCheck,
        { provide: ConfigService, useValue: configService },
        { provide: HealthIndicatorService, useValue: healthIndicator },
        { provide: APP_OPTIONS_TOKEN, useValue: mockAppOptionsMicroservice },
      ],
    }).compile();

    service = module.get<NotificationCheck>(NotificationCheck);
  });

  function mockConfig() {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'ENDPOINT_PORT') return '6380';
      if (key === 'ENDPOINT_HOST') return '127.0.0.1';
      return undefined;
    });
  }
});
