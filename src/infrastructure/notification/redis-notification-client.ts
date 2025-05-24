import { ClientProxy } from '@nestjs/microservices';
import { NotificationClient } from './notification-client.interface';

export class RedisNotificationClient implements NotificationClient {
  constructor(private readonly client: ClientProxy) {}

  public emit(event: string, payload: unknown): void {
    this.client.emit(event, payload);
  }
}
