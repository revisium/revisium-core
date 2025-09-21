import { PgBusDriver, pgBusDriver } from '../pg-bus.driver';
import { Pool, Client } from 'pg';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
  Client: jest.fn(),
}));

describe('PgBusDriver Debug Mode Tests', () => {
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

    // Mock console to capture debug messages
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    jest.clearAllMocks();
  });

  describe('Debug Mode Enabled', () => {
    beforeEach(() => {
      driver = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        debug: true,
      }).factory({});

      driver.setId('test-debug-driver');
    });

    it('should log debug messages when debug is enabled', async () => {
      await driver.subscribe('test_channel', () => {});

      // Should have logged "LISTEN connected"
      expect(mockConsoleLog).toHaveBeenCalledWith('[pg-bus] LISTEN connected');
    });

    it('should log self-message filtering when debug is enabled', async () => {
      const handler = jest.fn();
      await driver.subscribe('test_channel', handler);

      // Get the notification handler from mock calls
      let notificationHandler: ((notification: any) => void) | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as (notification: any) => void;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      // Simulate receiving our own message
      notificationHandler!({
        channel: 'test_channel',
        payload: JSON.stringify({
          payload: { type: 'cache:set', keys: ['key1'] },
          busId: 'test-debug-driver', // Same as our driver's ID
        }),
      });

      // Should have logged the debug message about ignoring own message
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[pg-bus] ignoring message published by the same bus instance',
      );

      // Handler should not have been called
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Debug Mode Disabled (Default)', () => {
    beforeEach(() => {
      driver = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        // debug: false is default
      }).factory({});

      driver.setId('test-nodebug-driver');
    });

    it('should not log debug messages when debug is disabled', async () => {
      await driver.subscribe('test_channel', () => {});

      // Should NOT have logged "LISTEN connected"
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        '[pg-bus] LISTEN connected',
      );
    });

    it('should not log self-message filtering when debug is disabled', async () => {
      const handler = jest.fn();
      await driver.subscribe('test_channel', handler);

      // Get the notification handler from mock calls
      let notificationHandler: ((notification: any) => void) | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as (notification: any) => void;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      // Simulate receiving our own message
      notificationHandler!({
        channel: 'test_channel',
        payload: JSON.stringify({
          payload: { type: 'cache:set', keys: ['key1'] },
          busId: 'test-nodebug-driver', // Same as our driver's ID
        }),
      });

      // Should NOT have logged the debug message
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        '[pg-bus] ignoring message published by the same bus instance',
      );

      // Handler should still not have been called
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Error Messages Always Logged', () => {
    let mockConsoleWarn: jest.SpyInstance;
    let mockConsoleError: jest.SpyInstance;

    beforeEach(() => {
      mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

      driver = pgBusDriver({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        debug: false, // Debug disabled
      }).factory({});

      driver.setId('test-error-driver');
    });

    afterEach(() => {
      mockConsoleWarn.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should always log error messages regardless of debug setting', async () => {
      const handler = jest.fn();
      await driver.subscribe('test_channel', handler);

      // Get the notification handler from mock calls
      let notificationHandler: ((notification: any) => void) | undefined;
      for (const call of mockClient.on.mock.calls) {
        if ((call[0] as string) === 'notification') {
          notificationHandler = call[1] as (notification: any) => void;
          break;
        }
      }
      expect(notificationHandler).toBeDefined();

      // Simulate malformed JSON
      notificationHandler!({
        channel: 'test_channel',
        payload: 'invalid json{',
      });

      // Should have logged error despite debug being disabled
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[pg-bus] invalid JSON payload on test_channel:',
        'invalid json{',
        expect.any(Error),
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
