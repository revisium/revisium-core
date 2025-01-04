import { ClientProxy, ReadPacket } from '@nestjs/microservices';
import { EventEmitter } from 'node:events';

export class InMemoryClient extends ClientProxy {
  constructor(private readonly client: EventEmitter) {
    super();
  }

  close() {
    /*
     * This method is intentionally left empty because the InMemoryClient
     * does not maintain any persistent connections that need to be closed.
     */
  }

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
