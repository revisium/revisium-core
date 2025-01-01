import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { FindDraftRevisionInBranchOrThrowQuery } from 'src/share/queries/impl';
import { FindDraftRevisionInBranchType } from 'src/share/queries/types';

@QueryHandler(FindDraftRevisionInBranchOrThrowQuery)
export class FindDraftRevisionInBranchOrThrowHandler
  implements IQueryHandler<FindDraftRevisionInBranchOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindDraftRevisionInBranchOrThrowQuery): Promise<FindDraftRevisionInBranchType> {
    const existingDraftRevision =
      await this.transaction.revision.findFirstOrThrow({
        where: { isDraft: true, branchId: data.branchId },
        select: { id: true },
      });

    if (!existingDraftRevision) {
      throw new BadRequestException(
        'A branch with this name does not exist in the project',
      );
    }

    return existingDraftRevision;
  }
}
