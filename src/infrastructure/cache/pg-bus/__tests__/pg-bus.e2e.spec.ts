import { pgBusDriver, PgBusDriver } from '../pg-bus.driver';
import { CacheBusMessage } from 'bentocache/types';

describe('PgBusDriver E2E Tests', () => {
  let driver1: PgBusDriver;
  let driver2: PgBusDriver;

  const connectionString = process.env.DATABASE_URL!;

  beforeAll(async () => {
    // Validate DATABASE_URL is available
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is required for tests',
      );
    }

    // Create two bus driver instances directly
    driver1 = pgBusDriver({
      connectionString,
      applicationName: 'test-driver1',
    }).factory({});

    driver2 = pgBusDriver({
      connectionString,
      applicationName: 'test-driver2',
    }).factory({});

    // Set IDs for identification
    driver1.setId('driver1');
    driver2.setId('driver2');

    // Wait a bit for connections to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up connections
    if (driver1) {
      await driver1.disconnect();
    }
    if (driver2) {
      await driver2.disconnect();
    }
  });

  it('should establish connections without errors', async () => {
    // Test basic connection by publishing a message
    const testChannel = 'test_connection';
    const testMessage: CacheBusMessage = {
      type: 'cache:set',
      keys: ['test-key'],
    };

    await expect(
      driver1.publish(testChannel, testMessage),
    ).resolves.not.toThrow();
    await expect(
      driver2.publish(testChannel, testMessage),
    ).resolves.not.toThrow();
  });

  it('should publish and receive messages between driver instances', async () => {
    const testChannel = 'cache_invalidation';
    const testMessage: CacheBusMessage = {
      type: 'cache:delete',
      keys: ['shared-test-key'],
    };

    // Track received messages on driver2
    const receivedMessages: CacheBusMessage[] = [];
    await driver2.subscribe(testChannel, (message: CacheBusMessage) => {
      receivedMessages.push(message);
    });

    // Wait for subscription to be established
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Publish message from driver1
    await driver1.publish(testChannel, testMessage);

    // Wait for message propagation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify the message was received by driver2
    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0]).toEqual(testMessage);
  });

  it('should handle multiple simultaneous publications', async () => {
    const testChannel = 'concurrent_test';
    const receivedMessages: CacheBusMessage[] = [];

    // Subscribe driver2 to receive messages
    await driver2.subscribe(testChannel, (message: CacheBusMessage) => {
      receivedMessages.push(message);
    });

    // Wait for subscription
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Publish multiple messages simultaneously from driver1
    const promises = [];
    for (let i = 0; i < 5; i++) {
      const message: CacheBusMessage = {
        type: 'cache:set',
        keys: [`concurrent-key-${i}`],
      };
      promises.push(driver1.publish(testChannel, message));
    }

    await Promise.all(promises);

    // Wait for all messages to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should have received multiple messages
    expect(receivedMessages.length).toBe(5);
  });

  it('should handle multiple publish operations in sequence', async () => {
    const testChannel = 'sequence_test';
    const receivedMessages: CacheBusMessage[] = [];

    // Subscribe driver2 to receive messages
    await driver2.subscribe(testChannel, (message: CacheBusMessage) => {
      receivedMessages.push(message);
    });

    // Wait for subscription
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Publish multiple messages in sequence to stress the connection
    for (let i = 0; i < 3; i++) {
      const message: CacheBusMessage = {
        type: 'cache:delete',
        keys: [`sequence-key-${i}`],
      };
      await driver1.publish(testChannel, message);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait for all messages to propagate
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify all messages were received
    expect(receivedMessages.length).toBe(3);
  });

  it('should handle invalid channel names gracefully', async () => {
    // The bus driver should validate channel names
    // This test verifies error handling for invalid channels

    // Create a custom driver to test direct channel validation
    const driver = pgBusDriver({
      connectionString,
      applicationName: 'test-validation',
    }).factory({});

    // Set ID for the driver
    driver.setId('test-validation-driver');

    // Test invalid channel names
    await expect(
      driver.subscribe('invalid channel with spaces', () => {}),
    ).rejects.toThrow('Invalid channel');

    await expect(
      driver.publish('invalid-channel-!@#$', { type: 'test' }),
    ).rejects.toThrow('Invalid channel');

    await driver.disconnect();
  });

  it('should handle large payloads within PostgreSQL NOTIFY limits', async () => {
    const driver = pgBusDriver({
      connectionString,
      applicationName: 'test-payload',
    }).factory({});

    // Set ID for the driver
    driver.setId('test-payload-driver');

    // Test payload that's within limits
    const validPayload = {
      type: 'test',
      data: 'a'.repeat(7000), // Well under 8KB limit
    };

    await expect(
      driver.publish('test_channel', validPayload),
    ).resolves.not.toThrow();

    // Test payload that exceeds PostgreSQL NOTIFY limit
    const largePayload = {
      type: 'test',
      data: 'a'.repeat(8500), // Over 8KB limit
    };

    await expect(driver.publish('test_channel', largePayload)).rejects.toThrow(
      'NOTIFY payload too large',
    );

    await driver.disconnect();
  });
});
