import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationClient } from './notification-client.interface';

export class InMemoryNotificationClient implements NotificationClient {
  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }
}
