import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EndpointType } from '@prisma/client';

@Injectable()
export class EndpointNotificationService {
  private readonly logger = new Logger(EndpointNotificationService.name);

  constructor(@Inject('ENDPOINT_MICROSERVICE') private client: ClientProxy) {}

  public create(endpointId: string) {
    this.logger.log(`endpoint_created id=${endpointId}`);
    this.client.emit<void, string>('endpoint_created', endpointId);
  }

  public update(endpointId: string) {
    this.logger.log(`endpoint_updated id=${endpointId}`);
    this.client.emit<void, string>('endpoint_updated', endpointId);
  }

  public delete(endpointId: string, endpointType: EndpointType) {
    this.logger.log(`endpoint_deleted id=${endpointId} type=${endpointType}`);
    this.client.emit<void, { endpointId: string; endpointType: EndpointType }>(
      'endpoint_deleted',
      {
        endpointId,
        endpointType,
      },
    );
  }
}
