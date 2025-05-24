import { RedisNotificationClient } from '../redis-notification-client';

describe('RedisNotificationClient', () => {
  it('should emit event', () => {
    const emit = jest.fn().mockReturnValue({ subscribe: jest.fn() });
    const mockClient = { emit } as any;

    const client = new RedisNotificationClient(mockClient);
    client.emit('event_name', { key: 'value' });

    expect(emit).toHaveBeenCalledWith('event_name', { key: 'value' });
  });
});
