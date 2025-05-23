import { EventEmitter } from 'node:events';
import { notificationEventEmitter } from 'src/infrastructure/notification/notification-event-emitter';
import { InMemoryServer } from '../in-memory-server';

describe('InMemoryServer', () => {
  let server: InMemoryServer;

  beforeEach(() => {
    server = new InMemoryServer();
  });

  it('should listen to registered message handlers', () => {
    const mockHandler = jest.fn();
    (server as any).messageHandlers = new Map([['pattern', mockHandler]]);
    const callback = jest.fn();

    server.listen(callback);

    notificationEventEmitter.emit('pattern');

    expect(mockHandler).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });

  it('should register event with on()', () => {
    const callback = jest.fn();
    server.on('custom-event', callback);

    notificationEventEmitter.emit('custom-event');

    expect(callback).toHaveBeenCalled();
  });

  it('should unwrap the underlying EventEmitter', () => {
    const unwrapped = server.unwrap<EventEmitter>();
    expect(unwrapped).toBe(notificationEventEmitter);
  });
});
