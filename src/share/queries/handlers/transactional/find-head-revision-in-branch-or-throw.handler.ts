import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { FindHeadRevisionInBranchOrThrowQuery } from 'src/share/queries/impl';
import { FindHeadRevisionInBranchType } from 'src/share/queries/types';

@QueryHandler(FindHeadRevisionInBranchOrThrowQuery)
export class FindHeadRevisionInBranchOrThrowHandler
  implements IQueryHandler<FindHeadRevisionInBranchOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindHeadRevisionInBranchOrThrowQuery): Promise<FindHeadRevisionInBranchType> {
    const existingHeadRevision =
      await this.transaction.revision.findFirstOrThrow({
        where: { isHead: true, branchId: data.branchId },
        select: { id: true },
      });

    if (!existingHeadRevision) {
      throw new Error('A branch with this name does not exist in the project');
    }

    return existingHeadRevision;
  }
}
