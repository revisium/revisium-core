import { Test } from '@nestjs/testing';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { NotificationModule } from '../notification.module';
import { EndpointNotificationService } from '../endpoint-notification.service';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

describe('NotificationModule', () => {
  const mockEmitter = { emit: jest.fn() };
  const mockRedisClient = { emit: jest.fn() };

  const baseImports = [EventEmitterModule.forRoot()];

  const createModule = async ({
    mode,
    configOverrides = {},
    notificationClientOverride,
  }: {
    mode: AppOptions['mode'];
    configOverrides?: Record<string, string>;
    notificationClientOverride?: any;
  }) => {
    const configMock: Partial<ConfigService> = {
      get: (key: string) => configOverrides[key],
      getOrThrow: (key: string) => {
        const val = configOverrides[key];
        if (val === undefined) throw new Error(`Missing env: ${key}`);
        return val;
      },
    };

    return Test.createTestingModule({
      imports: [...baseImports, NotificationModule],
      providers: [
        { provide: APP_OPTIONS_TOKEN, useValue: { mode } },
        { provide: ConfigService, useValue: configMock },
        { provide: EventEmitter2, useValue: mockEmitter },
        notificationClientOverride && {
          provide: 'NOTIFICATION_CLIENT',
          useValue: notificationClientOverride,
        },
      ].filter(Boolean),
    }).compile();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers EndpointNotificationService in monolith mode', async () => {
    const moduleRef = await createModule({
      mode: 'monolith',
    });

    const service = moduleRef.get(EndpointNotificationService);
    expect(service).toBeDefined();

    service.create('abc123');
    expect(mockEmitter.emit).toHaveBeenCalledWith('endpoint_created', 'abc123');
  });

  it('registers EndpointNotificationService in microservice mode and emits via Redis', async () => {
    const moduleRef = await createModule({
      mode: 'microservice',
      configOverrides: {
        ENDPOINT_HOST: 'localhost',
        ENDPOINT_PORT: '6379',
      },
      notificationClientOverride: mockRedisClient,
    });

    const service = moduleRef.get(EndpointNotificationService);
    expect(service).toBeDefined();

    service.update('xyz456');
    expect(mockRedisClient.emit).toHaveBeenCalledWith(
      'endpoint_updated',
      'xyz456',
    );
  });

  it('throws if ENDPOINT_HOST is missing in microservice mode', async () => {
    await expect(
      createModule({
        mode: 'microservice',
        configOverrides: {
          ENDPOINT_PORT: '6379',
        },
      }),
    ).rejects.toThrow('Missing env: ENDPOINT_HOST');
  });

  it('throws if ENDPOINT_PORT is missing in microservice mode', async () => {
    await expect(
      createModule({
        mode: 'microservice',
        configOverrides: {
          ENDPOINT_HOST: 'localhost',
        },
      }),
    ).rejects.toThrow('Missing env: ENDPOINT_PORT');
  });
});
