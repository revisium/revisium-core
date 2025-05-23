import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { notificationEventEmitter } from 'src/infrastructure/notification/notification-event-emitter';

export class InMemoryServer extends Server implements CustomTransportStrategy {
  constructor() {
    super();
  }

  close(): any {}

  listen(callback: (...optionalParams: unknown[]) => any): any {
    for (const [pattern, handler] of this.messageHandlers) {
      notificationEventEmitter.on(pattern, handler);
    }

    callback();
  }

  on<EventKey extends string = string, EventCallback = () => void>(
    event: EventKey,
    callback: EventCallback,
  ): any {
    notificationEventEmitter.on(event, callback as any);
    return this;
  }

  unwrap<T>(): T {
    return notificationEventEmitter as unknown as T;
  }
}
