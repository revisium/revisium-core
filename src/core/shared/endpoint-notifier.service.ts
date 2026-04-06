import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

@Injectable()
export class EndpointNotifierService {
  private readonly logger = new Logger(EndpointNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  async notify(revisionId: string): Promise<void> {
    try {
      const endpoints = await this.prisma.revision
        .findUniqueOrThrow({ where: { id: revisionId } })
        .endpoints({
          where: { isDeleted: false },
          select: { id: true },
        });

      for (const { id } of endpoints) {
        await this.endpointNotification.update(id);
      }
    } catch (e) {
      this.logger.warn('Endpoint notification failed (non-critical)', e);
    }
  }
}
