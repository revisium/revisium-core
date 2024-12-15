import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { FindBranchInProjectOrThrowQuery } from 'src/share/queries/impl';
import { FindBranchInProjectType } from 'src/share/queries/types';

@QueryHandler(FindBranchInProjectOrThrowQuery)
export class FindBranchInProjectOrThrowHandler
  implements IQueryHandler<FindBranchInProjectOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindBranchInProjectOrThrowQuery): Promise<FindBranchInProjectType> {
    const existingBranch = await this.transaction.branch.findUnique({
      where: {
        name_projectId: {
          name: data.branchName,
          projectId: data.projectId,
        },
      },
      select: { id: true },
    });

    if (!existingBranch) {
      throw new Error('A branch with this name does not exist in the project');
    }

    return existingBranch;
  }
}
