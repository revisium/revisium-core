import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { GetBranchQuery } from 'src/features/branch/quieries/impl/get-branch.query';
import { GetBranchReturnType } from 'src/features/branch/quieries/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetBranchQuery)
export class GetBranchHandler implements IQueryHandler<GetBranchQuery> {
  constructor(
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  execute({ data }: GetBranchQuery): Promise<GetBranchReturnType> {
    return this.transactionPrisma.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: GetBranchQuery['data']) {
    const { organizationId, projectName, branchName } = data;

    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        organizationId,
        projectName,
      );

    const { id: branchId } =
      await this.shareTransactionalQueries.findBranchInProjectOrThrow(
        projectId,
        branchName,
      );

    return this.getBranch(branchId);
  }

  private getBranch(branchId: string) {
    return this.transaction.branch.findUniqueOrThrow({
      where: { id: branchId },
    });
  }
}
