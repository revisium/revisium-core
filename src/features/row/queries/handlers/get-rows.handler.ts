import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  OrderByConditions,
  WhereConditionsTyped,
} from '@revisium/prisma-pg-json';
import { PluginService } from 'src/features/plugin/plugin.service';
import { SystemColumnMappingService } from 'src/features/row/services/system-column-mapping.service';
import { DEFAULT_ROW_FIELDS } from 'src/features/row/utils/get-rows-sql';
import { getKeysetPagination } from 'src/features/row/utils/get-keyset-pagination';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRowsQuery,
  GetRowsQueryData,
  GetRowsQueryReturnType,
} from 'src/features/row/queries/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetRowsQuery)
export class GetRowsHandler implements IQueryHandler<
  GetRowsQuery,
  GetRowsQueryReturnType
> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly pluginService: PluginService,
    private readonly systemColumnMappingService: SystemColumnMappingService,
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

    const mappedData = await this.mapFieldsToSystemColumns(data);

    return getKeysetPagination({
      pageData: data,
      tableVersionId,
      whereConditions: mappedData.where as unknown as WhereConditionsTyped<
        typeof DEFAULT_ROW_FIELDS
      >,
      orderBy: mappedData.orderBy as unknown as OrderByConditions[],
      queryRaw: (sql) => this.transaction.$queryRaw(sql),
      transformRows: async (rows) => {
        const { formulaErrors } = await this.pluginService.computeRows({
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
          formulaErrors: formulaErrors?.get(row.id),
        }));
      },
    });
  }

  private async mapFieldsToSystemColumns(
    data: GetRowsQueryData,
  ): Promise<GetRowsQueryData> {
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    const mappedWhere = this.systemColumnMappingService.mapWhereConditions(
      data.where,
      schema,
    );

    const mappedOrderBy = this.systemColumnMappingService.mapOrderByConditions(
      data.orderBy,
      schema,
    );

    return {
      ...data,
      where: mappedWhere,
      orderBy: mappedOrderBy,
    };
  }
}
