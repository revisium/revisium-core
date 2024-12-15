import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { FindTableInRevisionOrThrowQuery } from 'src/share/queries/impl/transactional/find-table-in-revision-or-throw.query';
import { FindTableInRevisionType } from 'src/share/queries/types';

@QueryHandler(FindTableInRevisionOrThrowQuery)
export class FindTableInRevisionOrThrowHandler
  implements IQueryHandler<FindTableInRevisionOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindTableInRevisionOrThrowQuery): Promise<FindTableInRevisionType> {
    const existingTable = await this.transaction.table.findFirst({
      where: {
        id: data.tableId,
        revisions: { some: { id: data.revisionId } },
      },
      select: { versionId: true, readonly: true, system: true },
    });

    if (!existingTable) {
      throw new Error('A table with this name does not exist in the revision');
    }

    return existingTable;
  }
}
