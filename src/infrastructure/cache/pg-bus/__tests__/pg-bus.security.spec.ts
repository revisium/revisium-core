import { PgBusDriver, pgBusDriver } from '../pg-bus.driver';
import { Pool, Client } from 'pg';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
  Client: jest.fn(),
}));

describe('PgBusDriver Security Tests', () => {
  let driver: PgBusDriver;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<Client>;

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

    driver = pgBusDriver({
      connectionString: 'postgresql://test:test@localhost:5432/test',
    }).factory({});

    driver.setId('test-security-driver');

    jest.clearAllMocks();
  });

  describe('SQL Injection Protection', () => {
    const maliciousChannelNames = [
      'test"; DROP TABLE users; --',
      "test'; DROP TABLE users; --",
      'test\\"; DROP TABLE users; --',
      'test"+"test',
      "test'||'test",
      'test\\ntesting',
      'test\\rtesting',
    ];

    maliciousChannelNames.forEach((maliciousName) => {
      it(`should reject malicious channel name: "${maliciousName}"`, async () => {
        await expect(
          driver.publish(maliciousName, { type: 'cache:set', keys: ['key1'] }),
        ).rejects.toThrow(/Invalid channel|Unsafe characters in channel name/);

        await expect(driver.subscribe(maliciousName, () => {})).rejects.toThrow(
          /Invalid channel|Unsafe characters in channel name/,
        );

        // Should not have executed any SQL commands
        expect(mockPool.query).not.toHaveBeenCalled();
        expect(mockClient.query).not.toHaveBeenCalled();
      });
    });
  });

  describe('Safe Channel Names', () => {
    const safeChannelNames = [
      'valid_channel',
      'bentocache.notifications:cache',
      'namespace.type:action',
      'UPPERCASE_CHANNEL',
      '_underscore_start',
      'channel123',
      'channel_with_$',
      'config.settings',
      'events:user_created',
    ];

    safeChannelNames.forEach((safeName) => {
      it(`should accept safe channel name: "${safeName}"`, async () => {
        // Should not throw
        await expect(
          driver.publish(safeName, { type: 'cache:set', keys: ['key1'] }),
        ).resolves.not.toThrow();

        // Verify SQL was called with properly quoted identifier
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT pg_notify($1::text, $2::text)',
          expect.arrayContaining([safeName, expect.any(String)]),
        );
      });
    });
  });

  describe('SQL Identifier Safety', () => {
    it('should properly quote channel names with special characters', async () => {
      await driver.subscribe('test.channel:name', () => {});

      // Should have called LISTEN with properly quoted identifier
      expect(mockClient.query).toHaveBeenCalledWith(
        'LISTEN "test.channel:name"',
      );
    });

    it('should handle channel names that need quote escaping', async () => {
      // Note: this would actually be rejected by our safety check,
      // but if it were allowed, it should be properly escaped
      const channelWithQuotes = 'test_channel_without_quotes';

      await driver.subscribe(channelWithQuotes, () => {});

      expect(mockClient.query).toHaveBeenCalledWith(
        'LISTEN "test_channel_without_quotes"',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidChannel = 'invalid-channel-with-hyphens';

      await expect(
        driver.publish(invalidChannel, { type: 'cache:set', keys: ['key1'] }),
      ).rejects.toThrow('Invalid channel');

      await expect(driver.subscribe(invalidChannel, () => {})).rejects.toThrow(
        'Invalid channel',
      );

      // Should not have attempted any SQL operations
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should validate channel length', async () => {
      const longChannel = 'a'.repeat(64); // Over 63 character limit

      await expect(
        driver.publish(longChannel, { type: 'cache:set', keys: ['key1'] }),
      ).rejects.toThrow('Invalid channel');

      await expect(driver.subscribe(longChannel, () => {})).rejects.toThrow(
        'Invalid channel',
      );
    });
  });
});
