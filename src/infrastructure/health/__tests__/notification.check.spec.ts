import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MicroserviceHealthIndicator } from '@nestjs/terminus';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { Transport, RedisOptions } from '@nestjs/microservices';
import { NotificationCheck } from 'src/infrastructure/health/notification.check';

describe('NotificationCheck', () => {
  describe('available', () => {
    it('should return true when mode is microservice', () => {
      expect(service.available).toBe(true);
    });

    it('should return false when mode is not microservice', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationCheck,
          { provide: ConfigService, useValue: configService },
          { provide: MicroserviceHealthIndicator, useValue: microservice },
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

    it('should call pingCheck with correct redis options and return result', async () => {
      const mockPort = '6380';
      const mockHost = '127.0.0.1';
      const expectedOptions: RedisOptions = {
        transport: Transport.REDIS,
        options: { host: mockHost, port: Number.parseInt(mockPort) },
      };
      const mockResult = { status: 'up' };

      (configService.get as jest.Mock)
        .mockImplementationOnce(() => mockPort)
        .mockImplementationOnce(() => mockHost);
      (microservice.pingCheck as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.check();

      expect(microservice.pingCheck).toHaveBeenCalledWith(
        'notifications',
        expectedOptions,
      );
      expect(result).toBe(mockResult);
    });
  });

  let service: NotificationCheck;
  let configService: Partial<ConfigService>;
  let microservice: Partial<MicroserviceHealthIndicator>;
  const mockAppOptionsMicroservice: AppOptions = { mode: 'microservice' };
  const mockAppOptionsMonolith: AppOptions = { mode: 'monolith' };

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };

    microservice = {
      pingCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationCheck,
        { provide: ConfigService, useValue: configService },
        { provide: MicroserviceHealthIndicator, useValue: microservice },
        { provide: APP_OPTIONS_TOKEN, useValue: mockAppOptionsMicroservice },
      ],
    }).compile();

    service = module.get<NotificationCheck>(NotificationCheck);
  });
});
