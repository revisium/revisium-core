import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, Row } from '@prisma/client';
import { OrderByConditions, WhereConditions } from '@revisium/prisma-pg-json';
import { PluginService } from 'src/features/plugin/plugin.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRowsQuery,
  GetRowsQueryData,
  GetRowsQueryReturnType,
} from 'src/features/row/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { generateGetRowsQueryPrisma } from 'src/utils/prisma-sql-generator/generate-get-rows';

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
    const { versionId: tableVersionId } =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.tableId,
      );

    return getOffsetPagination({
      pageData: data,
      findMany: async (args) => {
        const rows = await this.getRows(args, tableVersionId, data);

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
      count: () => this.getRowsCount(tableVersionId, data),
    });
  }

  private getRows(
    args: { take: number; skip: number },
    tableVersionId: string,
    data: GetRowsQueryData,
  ): Promise<Row[]> {
    if (this.isSimpleOrdering(data.orderBy)) {
      return this.transaction.table
        .findUniqueOrThrow({ where: { versionId: tableVersionId } })
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
          tableVersionId,
          args.take,
          args.skip,
          data.where as unknown as WhereConditions,
          data.orderBy as unknown as OrderByConditions[],
        ),
      );
    }
  }

  private isSimpleOrdering(
    order: GetRowsQueryData['orderBy'],
  ): order is Prisma.RowOrderByWithRelationInput[] | undefined {
    return !order || Boolean(order?.every((orderItem) => !orderItem['data']));
  }

  private async getRowsCount(tableVersionId: string, data: GetRowsQueryData) {
    const result = await this.transaction.table.findUniqueOrThrow({
      where: { versionId: tableVersionId },
      include: { _count: { select: { rows: { where: data.where } } } },
    });
    return result._count.rows;
  }
}
