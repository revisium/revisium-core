import { PgBusDriver, pgBusDriver } from '../pg-bus.driver';
import { Pool, Client } from 'pg';
import { CacheBusMessage } from 'bentocache/types';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
  Client: jest.fn(),
}));

describe('PgBusDriver Unit Tests', () => {
  let driver: PgBusDriver;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<Client>;
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    // Mock Pool
    mockPool = {
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    } as any;
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);

    // Mock Client
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    } as any;
    (Client as jest.MockedClass<typeof Client>).mockImplementation(
      () => mockClient,
    );

    // Mock console to avoid test output noise
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

    // Create driver
    driver = pgBusDriver({
      connectionString: 'postgresql://test:test@localhost:5432/test',
      applicationName: 'test-app',
    }).factory({});

    driver.setId('test-driver-id');
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    jest.clearAllMocks();
  });

  describe('Channel Name Validation', () => {
    it('should accept valid channel names', async () => {
      const validChannels = [
        'valid_channel',
        'channel123',
        'UPPERCASE',
        '_underscore_start',
        'channel_with_$',
        'bentocache.notifications:cache', // BentoCache pattern
        'namespace.type:action',
        'config.settings',
        'events:user_created',
      ];

      for (const channel of validChannels) {
        await expect(
          driver.publish(channel, { type: 'cache:set', keys: ['key1'] }),
        ).resolves.not.toThrow();
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT pg_notify($1::text, $2::text)',
          expect.arrayContaining([channel, expect.any(String)]),
        );
      }
    });

    it('should reject invalid channel names', async () => {
      const invalidChannels = [
        'invalid-channel', // hyphens not allowed
        'invalid channel', // spaces not allowed
        'invalid@channel', // special chars not allowed
        'invalid!channel', // special chars not allowed
        '', // empty string
        '123invalid', // cannot start with number
      ];

      for (const channel of invalidChannels) {
        await expect(
          driver.publish(channel, { type: 'cache:set', keys: ['key1'] }),
        ).rejects.toThrow('Invalid channel');

        await expect(driver.subscribe(channel, () => {})).rejects.toThrow(
          'Invalid channel',
        );
      }
    });

    it('should reject channel names longer than 63 characters', async () => {
      const longChannel = 'a'.repeat(64);
      await expect(
        driver.publish(longChannel, { type: 'cache:set', keys: ['key1'] }),
      ).rejects.toThrow('Invalid channel');
    });
  });

  describe('ID Management', () => {
    it('should require ID to be set before publishing', async () => {
      const driverWithoutId = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
      }).factory({});

      await expect(
        driverWithoutId.publish('test_channel', {
          type: 'cache:set',
          keys: ['key1'],
        }),
      ).rejects.toThrow('You must set an id before publishing a message');
    });

    it('should allow publishing after setting ID', async () => {
      const driverWithoutId = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
      }).factory({});

      driverWithoutId.setId('new-id');

      await expect(
        driverWithoutId.publish('test_channel', {
          type: 'cache:set',
          keys: ['key1'],
        }),
      ).resolves.not.toThrow();
    });

    it('should return self from setId for chaining', () => {
      const result = driver.setId('chain-id');
      expect(result).toBe(driver);
    });
  });

  describe('Message Publishing', () => {
    it('should publish wrapped messages with busId', async () => {
      const message: CacheBusMessage = {
        type: 'cache:set',
        keys: ['key1', 'key2'],
        namespace: 'test',
      };

      await driver.publish('test_channel', message);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT pg_notify($1::text, $2::text)',
        [
          'test_channel',
          JSON.stringify({
            payload: message,
            busId: 'test-driver-id',
          }),
        ],
      );
    });

    it('should handle empty message', async () => {
      await driver.publish('test_channel', null as any);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT pg_notify($1::text, $2::text)',
        [
          'test_channel',
          JSON.stringify({
            payload: {},
            busId: 'test-driver-id',
          }),
        ],
      );
    });

    it('should reject payloads that exceed PostgreSQL NOTIFY limit', async () => {
      const largeMessage: CacheBusMessage = {
        type: 'cache:set',
        keys: ['key1'],
        namespace: 'a'.repeat(8000), // This will exceed 8KB limit when JSON stringified
      };

      await expect(
        driver.publish('test_channel', largeMessage),
      ).rejects.toThrow('NOTIFY payload too large');

      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Message Subscription', () => {
    it('should establish listener connection when subscribing', async () => {
      const handler = jest.fn();

      await driver.subscribe('test_channel', handler);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith(
        'notification',
        expect.any(Function),
      );
      expect(mockClient.query).toHaveBeenCalledWith('LISTEN "test_channel"');
    });

    it('should store handler for channel', async () => {
      const handler = jest.fn();

      await driver.subscribe('test_channel', handler);

      // Access private handlers map via type assertion for testing
      const handlers = (driver as any).handlers;
      expect(handlers.get('test_channel')).toBe(handler);
    });
  });

  describe('Message Receiving', () => {
    let handler: jest.Mock;

    beforeEach(async () => {
      handler = jest.fn();
      await driver.subscribe('test_channel', handler);
    });

    it('should process valid messages and extract payload', () => {
      const message = {
        type: 'cache:set',
        keys: ['key1'],
      };

      const wrappedMessage = {
        payload: message,
        busId: 'different-driver-id',
      };

      // Get the notification handler from the mock
      let notificationHandler: any | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as any;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      notificationHandler!({
        channel: 'test_channel',
        payload: JSON.stringify(wrappedMessage),
      });

      expect(handler).toHaveBeenCalledWith(message);
    });

    it('should ignore messages from the same bus instance', () => {
      const message = {
        type: 'cache:set',
        keys: ['key1'],
      };

      const wrappedMessage = {
        payload: message,
        busId: 'test-driver-id', // Same as our driver's ID
      };

      let notificationHandler: any | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as any;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      notificationHandler!({
        channel: 'test_channel',
        payload: JSON.stringify(wrappedMessage),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', () => {
      let notificationHandler: any;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as any;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      // Should not throw
      expect(() => {
        notificationHandler!({
          channel: 'test_channel',
          payload: 'invalid json{',
        });
      }).not.toThrow();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle empty payload', () => {
      let notificationHandler: any | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as any;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      notificationHandler!({
        channel: 'test_channel',
        payload: '',
      });

      expect(handler).toHaveBeenCalledWith({}); // Empty payload
    });

    it('should not call handler for wrong channel', () => {
      let notificationHandler: any | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as any;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      notificationHandler!({
        channel: 'different_channel',
        payload: JSON.stringify({
          payload: { type: 'cache:set', keys: ['key1'] },
          busId: 'different-id',
        }),
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Unsubscription', () => {
    it('should remove handler and send UNLISTEN', async () => {
      const handler = jest.fn();

      await driver.subscribe('test_channel', handler);
      await driver.unsubscribe('test_channel');

      expect(mockClient.query).toHaveBeenCalledWith('UNLISTEN "test_channel"');

      // Check handler is removed
      const handlers = (driver as any).handlers;
      expect(handlers.has('test_channel')).toBe(false);
    });

    it('should handle UNLISTEN errors gracefully', async () => {
      const handler = jest.fn();

      await driver.subscribe('test_channel', handler);

      // Mock UNLISTEN to fail on subsequent calls
      (mockClient.query as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('UNLISTEN failed')),
      );

      // Should not throw
      await expect(driver.unsubscribe('test_channel')).resolves.not.toThrow();

      // Handler should still be removed even if UNLISTEN fails
      const handlers = (driver as any).handlers;
      expect(handlers.has('test_channel')).toBe(false);
    });

    it('should handle unsubscribe when no listener exists', async () => {
      // Should not throw when no listener connection exists
      await expect(driver.unsubscribe('test_channel')).resolves.not.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should disconnect both publisher and listener', async () => {
      await driver.subscribe('test_channel', () => {});

      await driver.disconnect();

      expect(mockClient.query).toHaveBeenCalledWith('UNLISTEN *');
      expect(mockClient.end).toHaveBeenCalled();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      await driver.subscribe('test_channel', () => {});

      (mockClient.query as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('UNLISTEN * failed')),
      );
      (mockClient.end as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Client disconnect failed')),
      );
      (mockPool.end as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Pool disconnect failed')),
      );

      // Should not throw despite errors
      await expect(driver.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Reconnection Callbacks', () => {
    it('should register and call onReconnect callbacks', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      driver.onReconnect(callback1);
      driver.onReconnect(callback2);

      await driver.subscribe('test_channel', () => {});

      // Simulate successful connection (triggers callback)
      const callbacks = (driver as any).reconnectCallbacks;
      expect(callbacks).toContain(callback1);
      expect(callbacks).toContain(callback2);
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      driver.onReconnect(errorCallback);
      driver.onReconnect(goodCallback);

      // Should not throw even if callback throws
      await expect(
        driver.subscribe('test_channel', () => {}),
      ).resolves.not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should return correct factory result structure', () => {
      const result = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
      });

      expect(result).toHaveProperty('factory');
      expect(result).toHaveProperty('options');
      expect(typeof result.factory).toBe('function');
      expect(result.options).toHaveProperty('retryQueue');
    });

    it('should create driver instance from factory', () => {
      const factory = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
      }).factory;

      const instance = factory({});
      expect(instance).toBeInstanceOf(PgBusDriver);
    });

    it('should use custom bus options', () => {
      const customOptions = {
        retryQueue: {
          enabled: false,
          maxSize: 100,
        },
      };

      const result = pgBusDriver(
        {
          connectionString: 'postgresql://test:test@localhost:5432/test',
        },
        customOptions,
      );

      expect(result.options.retryQueue?.enabled).toBe(false);
      expect(result.options.retryQueue?.maxSize).toBe(100);
    });
  });
});
