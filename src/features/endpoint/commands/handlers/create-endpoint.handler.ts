import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CreateEndpointCommand } from 'src/features/endpoint/commands/impl';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

@CommandHandler(CreateEndpointCommand)
export class CreateEndpointHandler
  implements ICommandHandler<CreateEndpointCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  async execute({ data }: CreateEndpointCommand): Promise<string> {
    const existEndpoint = await this.getEndpoint(data);

    if (existEndpoint && !existEndpoint.isDeleted) {
      throw new BadRequestException('Endpoint already has been created');
    }

    const endpoint = existEndpoint
      ? await this.restoreEndpoint(existEndpoint.id)
      : await this.createEndpoint(data);

    this.endpointNotification.create(endpoint.id);

    return endpoint.id;
  }

  private getEndpoint({ revisionId, type }: CreateEndpointCommand['data']) {
    return this.prisma.endpoint.findFirst({
      where: { revisionId, type },
    });
  }

  private restoreEndpoint(endpointId: string) {
    return this.prisma.endpoint.update({
      where: { id: endpointId },
      data: { isDeleted: false },
    });
  }

  private createEndpoint({ revisionId, type }: CreateEndpointCommand['data']) {
    return this.prisma.endpoint.create({
      data: {
        id: nanoid(),
        revision: {
          connect: {
            id: revisionId,
          },
        },
        type,
        version: {
          connect: {
            type_version: {
              type,
              version: 1,
            },
          },
        },
      },
    });
  }
}
