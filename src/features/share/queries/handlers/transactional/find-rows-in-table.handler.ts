import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { FindRowsInTableQuery } from 'src/features/share/queries/impl/transactional/find-rows-in-table.query';
import { FindRowsInTableType } from 'src/features/share/queries/types';

@QueryHandler(FindRowsInTableQuery)
export class FindRowsInTableHandler
  implements IQueryHandler<FindRowsInTableQuery>
{
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: FindRowsInTableQuery): Promise<FindRowsInTableType> {
    if (data.rowIds.length === 0) {
      return [];
    }

    return this.transaction.row.findMany({
      where: {
        OR: data.rowIds.map((id) => ({ id })),
        tables: { some: { versionId: data.tableVersionId } },
      },
      select: { id: true, versionId: true, readonly: true },
    });
  }
}
