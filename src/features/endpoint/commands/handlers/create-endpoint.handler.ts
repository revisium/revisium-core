import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  CreateEndpointCommand,
  CreateEndpointCommandReturnType,
} from 'src/features/endpoint/commands/impl';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { TransactionPrismaClient } from 'src/features/share/types';

@CommandHandler(CreateEndpointCommand)
export class CreateEndpointHandler implements ICommandHandler<
  CreateEndpointCommand,
  CreateEndpointCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionPrismaService,
    private readonly billingCheck: BillingCheckService,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: CreateEndpointCommand): Promise<string> {
    const endpoint = await this.transactionService.runSerializable(() =>
      this.transactionHandler(data),
    );

    await this.endpointNotification.create(endpoint.id);

    return endpoint.id;
  }

  private async transactionHandler(data: CreateEndpointCommand['data']) {
    const existEndpoint = await this.getEndpoint(data, this.transaction);

    if (existEndpoint && !existEndpoint.isDeleted) {
      throw new BadRequestException('Endpoint already has been created');
    }

    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.ENDPOINTS_PER_PROJECT,
    );

    return existEndpoint
      ? this.restoreEndpoint(existEndpoint.id, this.transaction)
      : this.createEndpoint(data, this.transaction);
  }

  private getEndpoint(
    { revisionId, type }: CreateEndpointCommand['data'],
    prisma: TransactionPrismaClient | PrismaService = this.prisma,
  ) {
    return prisma.endpoint.findFirst({
      where: { revisionId, type },
    });
  }

  private restoreEndpoint(
    endpointId: string,
    prisma: TransactionPrismaClient | PrismaService = this.prisma,
  ) {
    return prisma.endpoint.update({
      where: { id: endpointId },
      data: { isDeleted: false, createdAt: new Date() },
    });
  }

  private createEndpoint(
    { revisionId, type }: CreateEndpointCommand['data'],
    prisma: TransactionPrismaClient | PrismaService = this.prisma,
  ) {
    return prisma.endpoint.create({
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
