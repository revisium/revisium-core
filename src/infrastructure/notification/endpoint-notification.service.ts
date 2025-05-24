import { Inject, Injectable, Logger } from '@nestjs/common';
import { EndpointType } from '@prisma/client';
import { NotificationClient } from 'src/infrastructure/notification/notification-client.interface';

@Injectable()
export class EndpointNotificationService {
  private readonly logger = new Logger(EndpointNotificationService.name);

  constructor(
    @Inject('ENDPOINT_MICROSERVICE')
    private readonly client: NotificationClient,
  ) {}

  public create(endpointId: string) {
    this.logger.log(`endpoint_created id=${endpointId}`);
    this.client.emit<string>('endpoint_created', endpointId);
  }

  public update(endpointId: string) {
    this.logger.log(`endpoint_updated id=${endpointId}`);
    this.client.emit<string>('endpoint_updated', endpointId);
  }

  public delete(endpointId: string, endpointType: EndpointType) {
    this.logger.log(`endpoint_deleted id=${endpointId} type=${endpointType}`);
    this.client.emit<{ endpointId: string; endpointType: EndpointType }>(
      'endpoint_deleted',
      {
        endpointId,
        endpointType,
      },
    );
  }
}
