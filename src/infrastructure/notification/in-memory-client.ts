import { ClientProxy, ReadPacket } from '@nestjs/microservices';
import { EventEmitter } from 'node:events';

export class InMemoryClient extends ClientProxy {
  constructor(private client: EventEmitter) {
    super();
  }

  close(): any {}

  connect() {
    return Promise.resolve(true);
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    this.client.emit(packet.pattern, packet.data);
    return Promise.resolve(packet);
  }

  protected publish() {
    return () => {};
  }
}
