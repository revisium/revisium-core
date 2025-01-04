import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { GetTouchedByBranchIdQuery } from 'src/features/branch/quieries/impl';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetTouchedByBranchIdQuery)
export class GetTouchedByBranchIdHandler
  implements IQueryHandler<GetTouchedByBranchIdQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ branchId }: GetTouchedByBranchIdQuery): Promise<boolean> {
    return this.transactionService.run(
      () => this.transactionHandler(branchId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async transactionHandler(branchId: string) {
    const { id: draftTransactionQueries } =
      await this.shareTransactionQueries.findDraftRevisionInBranchOrThrow(
        branchId,
      );

    const { hasChanges } = await this.getChangelog(draftTransactionQueries);

    return hasChanges;
  }

  private getChangelog(draftTransactionQueries: string) {
    return this.transaction.revision
      .findUniqueOrThrow({
        where: { id: draftTransactionQueries },
      })
      .changelog({ select: { hasChanges: true } });
  }
}
