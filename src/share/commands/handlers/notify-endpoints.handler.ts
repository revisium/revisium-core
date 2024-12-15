import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { EndpointNotificationService } from 'src/notification/endpoint-notification.service';
import { NotifyEndpointsCommand } from 'src/share/commands/impl';

@CommandHandler(NotifyEndpointsCommand)
export class NotifyEndpointsHandler
  implements ICommandHandler<NotifyEndpointsCommand>
{
  constructor(
    private prisma: PrismaService,
    private endpointNotification: EndpointNotificationService,
  ) {}

  async execute({ data }: NotifyEndpointsCommand): Promise<void> {
    await this.notifyEndpoints(data.revisionId);
  }

  private async notifyEndpoints(revisionId: string) {
    const endpointIds = await this.getEndpointIds(revisionId);
    for (const endpointId of endpointIds) {
      this.endpointNotification.update(endpointId);
    }
  }

  private async getEndpointIds(revisionId: string) {
    return this.prisma.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .endpoints({ where: { isDeleted: false }, select: { id: true } })
      .then((result) => result.map(({ id }) => id));
  }
}
