import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { FindRowsInTableOrThrowQuery } from 'src/share/queries/impl/transactional/find-rows-in-table-or-throw.query';
import { FindRowsInTableType } from 'src/share/queries/types';

@QueryHandler(FindRowsInTableOrThrowQuery)
export class FindRowsInTableOrThrowHandler
  implements IQueryHandler<FindRowsInTableOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindRowsInTableOrThrowQuery): Promise<FindRowsInTableType> {
    const rows = await this.transaction.row.findMany({
      where: {
        OR: data.rowIds.map((id) => ({ id })),
        tables: { some: { versionId: data.tableVersionId } },
      },
      select: { id: true, versionId: true, readonly: true },
    });

    if (rows.length !== data.rowIds.length) {
      throw new Error('some rows do not exist in the revision');
    }

    return rows;
  }
}
