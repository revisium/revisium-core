import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { GetRowQuery } from 'src/row/queries/impl/get-row.query';
import { GetRowReturnType } from 'src/row/queries/types';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';

@QueryHandler(GetRowQuery)
export class GetRowHandler
  implements IQueryHandler<GetRowQuery, GetRowReturnType>
{
  constructor(
    private transactionService: TransactionPrismaService,
    private shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: GetRowQuery): Promise<GetRowReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: GetRowQuery['data'],
  ): Promise<GetRowReturnType> {
    try {
      const { versionId: tableVersionId } =
        await this.shareTransactionalQueries.findTableInRevisionOrThrow(
          data.revisionId,
          data.tableId,
        );

      const { versionId: rowId } =
        await this.shareTransactionalQueries.findRowInTableOrThrow(
          tableVersionId,
          data.rowId,
        );

      return {
        ...(await this.getRow(rowId)),
        context: {
          revisionId: data.revisionId,
          tableId: data.tableId,
        },
      };
    } catch (e) {
      return null;
    }
  }

  private getRow(rowId: string) {
    return this.transaction.row.findUniqueOrThrow({
      where: { versionId: rowId },
    });
  }
}
