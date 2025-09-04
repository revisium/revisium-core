import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, Row } from '@prisma/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRowsQuery,
  GetRowsQueryData,
  GetRowsQueryReturnType,
} from 'src/features/row/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  generateGetRowsQueryPrisma,
  WhereConditions,
} from 'src/utils/prisma-sql-generator';

@QueryHandler(GetRowsQuery)
export class GetRowsHandler
  implements IQueryHandler<GetRowsQuery, GetRowsQueryReturnType>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly pluginService: PluginService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransactionOrPrisma();
  }

  public async execute({ data }: GetRowsQuery) {
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
    if (this.isSimpleOrdering(data.orderBy)) {
      return this.transaction.table
        .findUniqueOrThrow({ where: { versionId: tableId } })
        .rows({
          ...args,
          orderBy: data.orderBy ?? {
            createdAt: Prisma.SortOrder.desc,
          },
          where: data.where,
        });
    } else {
      return this.transaction.$queryRaw(
        generateGetRowsQueryPrisma(
          tableId,
          args.take,
          args.skip,
          data.where as unknown as WhereConditions,
          data.orderBy,
        ),
      );
    }
  }

  private isSimpleOrdering(
    order: GetRowsQueryData['orderBy'],
  ): order is Prisma.RowOrderByWithRelationInput[] | undefined {
    return !order || Boolean(order?.every((orderItem) => !orderItem['data']));
  }

  private async getRowsCount(tableId: string) {
    const result = await this.transaction.table.findUniqueOrThrow({
      where: { versionId: tableId },
      include: { _count: { select: { rows: true } } },
    });
    return result._count.rows;
  }
}
