import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  CreateEndpointCommand,
  CreateEndpointCommandReturnType,
} from 'src/features/endpoint/commands/impl';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

@CommandHandler(CreateEndpointCommand)
export class CreateEndpointHandler implements ICommandHandler<
  CreateEndpointCommand,
  CreateEndpointCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingCheck: BillingCheckService,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  async execute({ data }: CreateEndpointCommand): Promise<string> {
    const existEndpoint = await this.getEndpoint(data);

    if (existEndpoint && !existEndpoint.isDeleted) {
      throw new BadRequestException('Endpoint already has been created');
    }

    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.ENDPOINTS_PER_PROJECT,
    );

    const endpoint = existEndpoint
      ? await this.restoreEndpoint(existEndpoint.id)
      : await this.createEndpoint(data);

    await this.endpointNotification.create(endpoint.id);

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
      data: { isDeleted: false, createdAt: new Date() },
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
