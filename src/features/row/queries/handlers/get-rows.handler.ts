import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, Row } from '@prisma/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetRowsQuery } from 'src/features/row/queries/impl';
import { GetRowsReturnType } from 'src/features/row/queries/types';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetRowsQuery)
export class GetRowsHandler
  implements IQueryHandler<GetRowsQuery, GetRowsReturnType>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly pluginService: PluginService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: GetRowsQuery): Promise<GetRowsReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: GetRowsQuery['data']) {
    const { versionId: tableId } =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.tableId,
      );

    return getOffsetPagination({
      pageData: data,
      findMany: async (args) => {
        const rows = await this.getRows(args, tableId, data);

        await this.pluginService.computeRows({
          revisionId: data.revisionId,
          tableId: data.tableId,
          rows,
        });

        return rows.map((row) => ({
          ...row,
          context: {
            revisionId: data.revisionId,
            tableId: data.tableId,
          },
        }));
      },
      count: () => this.getRowsCount(tableId),
    });
  }

  private getRows(
    args: { take: number; skip: number },
    tableId: string,
    data: GetRowsQuery['data'],
  ): Promise<Row[]> {
    return this.transaction.table
      .findUniqueOrThrow({ where: { versionId: tableId } })
      .rows({
        ...args,
        orderBy: data.orderBy ?? {
          createdAt: Prisma.SortOrder.desc,
        },
        where: data.where,
      });
  }

  private getRowsCount(tableId: string) {
    return this.transaction.table
      .findUniqueOrThrow({
        where: { versionId: tableId },
        include: { _count: { select: { rows: true } } },
      })
      .then((result) => result._count.rows);
  }
}
