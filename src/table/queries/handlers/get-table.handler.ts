import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import { GetTableQuery } from 'src/table/queries/impl/get-table.query';
import { GetTableReturnType } from 'src/table/queries/types';

@QueryHandler(GetTableQuery)
export class GetTableHandler
  implements IQueryHandler<GetTableQuery, GetTableReturnType>
{
  constructor(
    private transactionService: TransactionPrismaService,
    private shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: GetTableQuery): Promise<GetTableReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: GetTableQuery['data']) {
    try {
      const { versionId: tableId } =
        await this.shareTransactionalQueries.findTableInRevisionOrThrow(
          data.revisionId,
          data.tableId,
        );

      return {
        ...(await this.getTable(tableId)),
        context: {
          revisionId: data.revisionId,
        },
      };
    } catch (e) {
      console.error(e);

      return null;
    }
  }

  private getTable(tableId: string) {
    return this.transaction.table.findUniqueOrThrow({
      where: { versionId: tableId },
    });
  }
}
