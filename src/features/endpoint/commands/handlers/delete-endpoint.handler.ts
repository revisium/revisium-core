import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DeleteEndpointCommand } from 'src/features/endpoint/commands/impl/delete-endpoint.command';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

@CommandHandler(DeleteEndpointCommand)
export class DeleteEndpointHandler implements ICommandHandler<DeleteEndpointCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  async execute({ data }: DeleteEndpointCommand): Promise<boolean> {
    const endpoint = await this.getEndpoint(data.endpointId);
    await this.deleteEndpoint(data.endpointId);

    await this.endpointNotification.delete(endpoint.id);

    return true;
  }

  private getEndpoint(endpointId: string) {
    return this.prisma.endpoint.findUniqueOrThrow({
      where: { id: endpointId },
    });
  }

  private deleteEndpoint(endpointId: string) {
    return this.prisma.endpoint.update({
      where: {
        id: endpointId,
      },
      data: {
        isDeleted: true,
      },
    });
  }
}
