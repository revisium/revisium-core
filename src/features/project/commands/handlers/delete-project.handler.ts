import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EndpointType, Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import {
  DeleteProjectCommand,
  DeleteProjectCommandData,
  DeleteProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(DeleteProjectCommand)
export class DeleteProjectHandler
  implements
    ICommandHandler<DeleteProjectCommand, DeleteProjectCommandReturnType>
{
  constructor(
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  public async execute({ data }: DeleteProjectCommand) {
    const endpoints: { id: string; type: EndpointType }[] =
      await this.transactionPrisma.run(() => this.transactionHandler(data), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

    await this.notifyEndpoints(endpoints);

    return true;
  }

  private async transactionHandler(data: DeleteProjectCommandData) {
    const { organizationId, projectName } = data;

    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        organizationId,
        projectName,
      );

    const endpoints = await this.getEndpoints(projectId);
    await this.deleteProject(projectId);

    const endpointIds = endpoints.map((endpoints) => endpoints.id);
    await this.deleteEndpoint(endpointIds);

    return endpoints;
  }

  private deleteProject(projectId: string) {
    return this.transaction.project.update({
      where: { id: projectId },
      data: { isDeleted: true },
    });
  }

  private getEndpoints(projectId: string) {
    return this.transaction.endpoint.findMany({
      where: {
        revision: {
          branch: {
            projectId,
          },
        },
      },
      select: {
        id: true,
        type: true,
      },
    });
  }

  private async notifyEndpoints(
    endpoints: { id: string; type: EndpointType }[],
  ) {
    for (const endpoint of endpoints) {
      await this.endpointNotification.delete(endpoint.id);
    }
  }

  private async deleteEndpoint(endpointIds: string[]) {
    return this.transaction.endpoint.updateMany({
      where: {
        OR: endpointIds.map((endpointId) => ({ id: endpointId })),
      },
      data: {
        isDeleted: true,
      },
    });
  }
}
