import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import {
  DeleteBranchCommand,
  DeleteBranchCommandData,
  DeleteBranchCommandReturnType,
} from 'src/features/branch/commands/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(DeleteBranchCommand)
export class DeleteBranchHandler implements ICommandHandler<
  DeleteBranchCommand,
  DeleteBranchCommandReturnType
> {
  constructor(
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  public async execute({ data }: DeleteBranchCommand) {
    const endpointIds = await this.transactionPrisma.run(
      () => this.transactionHandler(data),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.notifyEndpoints(endpointIds);

    return true;
  }

  private async transactionHandler(data: DeleteBranchCommandData) {
    const { organizationId, projectName, branchName } = data;

    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        organizationId,
        projectName,
      );

    const branch =
      await this.shareTransactionalQueries.findBranchInProjectOrThrow(
        projectId,
        branchName,
      );

    if (branch.isRoot) {
      throw new BadRequestException('Cannot delete the root branch');
    }

    const childBranchNames = await this.getChildBranchNames(branch.id);
    if (childBranchNames.length > 0) {
      throw new BadRequestException(
        `Cannot delete branch: it has child branches (${childBranchNames.join(', ')}). Delete them first.`,
      );
    }

    const endpointIds = await this.getEndpointIds(branch.id);

    await this.deleteBranch(branch.id);

    return endpointIds;
  }

  private async getChildBranchNames(branchId: string): Promise<string[]> {
    const childBranches = await this.transaction.branch.findMany({
      where: {
        revisions: {
          some: {
            isStart: true,
            parent: {
              branchId,
            },
          },
        },
      },
      select: {
        name: true,
      },
    });

    return childBranches.map((b) => b.name);
  }

  private deleteBranch(branchId: string) {
    return this.transaction.branch.delete({
      where: { id: branchId },
    });
  }

  private async getEndpointIds(branchId: string): Promise<string[]> {
    const endpoints = await this.transaction.endpoint.findMany({
      where: {
        revision: {
          branchId,
        },
      },
      select: {
        id: true,
      },
    });

    return endpoints.map((e) => e.id);
  }

  private async notifyEndpoints(endpointIds: string[]) {
    for (const endpointId of endpointIds) {
      await this.endpointNotification.delete(endpointId);
    }
  }
}
