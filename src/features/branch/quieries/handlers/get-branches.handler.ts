import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import {
  GetBranchesQuery,
  GetBranchesQueryData,
  GetBranchesQueryReturnType,
} from 'src/features/branch/quieries/impl/get-branches.query';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetBranchesQuery)
export class GetBranchesHandler
  implements IQueryHandler<GetBranchesQuery, GetBranchesQueryReturnType>
{
  constructor(
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  execute({ data }: GetBranchesQuery) {
    return this.transactionPrisma.run<GetBranchesQueryReturnType>(
      () => this.transactionHandler(data),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async transactionHandler(
    data: GetBranchesQueryData,
  ): Promise<GetBranchesQueryReturnType> {
    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        data.organizationId,
        data.projectName,
      );

    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getBranches(args, projectId),
      count: () => this.getBranchesCount(projectId),
    });
  }

  private getBranches(args: { take: number; skip: number }, projectId: string) {
    return this.transaction.branch.findMany({
      ...args,
      where: { projectId: projectId },
      orderBy: { name: Prisma.SortOrder.asc },
    });
  }

  private getBranchesCount(projectId: string) {
    return this.transaction.branch.count({
      where: { projectId },
    });
  }
}
