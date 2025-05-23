import { EventEmitter } from 'node:events';
import { ReadPacket } from '@nestjs/microservices';
import { InMemoryClient } from 'src/infrastructure/notification/in-memory-client';

describe('InMemoryClient', () => {
  let client: EventEmitter;
  let inMemoryClient: InMemoryClient;

  beforeEach(() => {
    client = new EventEmitter();
    inMemoryClient = new InMemoryClient(client);
  });

  it('should connect successfully', async () => {
    await expect(inMemoryClient.connect()).resolves.toBe(true);
  });

  it('should dispatch event correctly', async () => {
    const pattern = 'test-pattern';
    const data = { key: 'value' };
    const packet: ReadPacket = { pattern, data };

    const mockListener = jest.fn();
    client.on(pattern, mockListener);

    await inMemoryClient['dispatchEvent'](packet);

    expect(mockListener).toHaveBeenCalledWith(data);
  });

  it('should unwrap the underlying EventEmitter', () => {
    const unwrapped = inMemoryClient.unwrap<EventEmitter>();
    expect(unwrapped).toBe(client);
  });

  it('should return a function', () => {
    const result = inMemoryClient['publish']();
    expect(typeof result).toBe('function');
  });
});
