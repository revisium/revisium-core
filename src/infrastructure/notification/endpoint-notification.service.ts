import { Injectable, Logger } from '@nestjs/common';
import { PostgresqlNotificationService } from 'src/infrastructure/database/postgresql-notification.service';

@Injectable()
export class EndpointNotificationService {
  private readonly logger = new Logger(EndpointNotificationService.name);

  constructor(
    private readonly postgresqlNotificationService: PostgresqlNotificationService,
  ) {}

  public async create(endpointId: string) {
    this.logger.log(`endpoint_created id=${endpointId}`);
    await this.postgresqlNotification('endpoint_created', endpointId);
  }

  public async update(endpointId: string) {
    this.logger.log(`endpoint_updated id=${endpointId}`);
    await this.postgresqlNotification('endpoint_updated', endpointId);
  }

  public async delete(endpointId: string) {
    this.logger.log(`endpoint_deleted id=${endpointId}`);
    await this.postgresqlNotification('endpoint_deleted', endpointId);
  }

  private postgresqlNotification(action: string, endpointId: string) {
    return this.postgresqlNotificationService.notify('endpoint_changes', {
      action,
      endpointId,
    });
  }
}
