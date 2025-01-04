import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { FindDraftRevisionInBranchOrThrowQuery } from 'src/features/share/queries/impl';
import { FindDraftRevisionInBranchType } from 'src/features/share/queries/types';

@QueryHandler(FindDraftRevisionInBranchOrThrowQuery)
export class FindDraftRevisionInBranchOrThrowHandler
  implements IQueryHandler<FindDraftRevisionInBranchOrThrowQuery>
{
  constructor(private readonly transactionService: TransactionPrismaService) {}

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
