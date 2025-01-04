import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { FindHeadRevisionInBranchOrThrowQuery } from 'src/features/share/queries/impl';
import { FindHeadRevisionInBranchType } from 'src/features/share/queries/types';

@QueryHandler(FindHeadRevisionInBranchOrThrowQuery)
export class FindHeadRevisionInBranchOrThrowHandler
  implements IQueryHandler<FindHeadRevisionInBranchOrThrowQuery>
{
  constructor(private readonly transactionService: TransactionPrismaService) {}

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
      throw new BadRequestException(
        'A branch with this name does not exist in the project',
      );
    }

    return existingHeadRevision;
  }
}
