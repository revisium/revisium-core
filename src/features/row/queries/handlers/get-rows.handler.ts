import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Row } from 'src/__generated__/client';
import {
  OrderByConditions,
  WhereConditionsTyped,
} from '@revisium/prisma-pg-json';
import { PluginService } from 'src/features/plugin/plugin.service';
import {
  getRowsSql,
  getRowsCountSql,
} from 'src/features/row/utils/get-rows-sql';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRowsQuery,
  GetRowsQueryData,
  GetRowsQueryReturnType,
} from 'src/features/row/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

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
    return this.transaction.$queryRaw(
      getRowsSql(
        tableVersionId,
        args.take,
        args.skip,
        data.where as unknown as WhereConditionsTyped<{ id: 'string' }>,
        data.orderBy as unknown as OrderByConditions[],
      ),
    );
  }

  private async getRowsCount(tableVersionId: string, data: GetRowsQueryData) {
    const result = await this.transaction.$queryRaw<[{ count: bigint }]>(
      getRowsCountSql(
        tableVersionId,
        data.where as unknown as WhereConditionsTyped<{ id: 'string' }>,
      ),
    );
    return Number(result[0].count);
  }
}
