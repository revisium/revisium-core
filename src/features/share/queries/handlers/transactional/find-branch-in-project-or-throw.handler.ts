import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { FindBranchInProjectOrThrowQuery } from 'src/features/share/queries/impl';
import { FindBranchInProjectType } from 'src/features/share/queries/types';

@QueryHandler(FindBranchInProjectOrThrowQuery)
export class FindBranchInProjectOrThrowHandler
  implements IQueryHandler<FindBranchInProjectOrThrowQuery>
{
  constructor(private readonly transactionService: TransactionPrismaService) {}

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
      throw new BadRequestException(
        'A branch with this name does not exist in the project',
      );
    }

    return existingBranch;
  }
}
