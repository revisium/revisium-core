import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PluginService } from 'src/features/plugin/plugin.service';
import {
  SearchRowResult,
  SearchRowsQuery,
  SearchRowsQueryData,
  SearchRowsResponse,
} from 'src/features/row/queries/impl';
import { extractMatchesFallback } from 'src/features/row/utils/extract-matches-fallback';
import {
  searchRowsCountSql,
  searchRowsSql,
  RowWithTable,
  convertRawRowsToEntities,
} from 'src/features/row/utils/search-rows-sql';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(SearchRowsQuery)
export class SearchRowsHandler implements IQueryHandler<
  SearchRowsQuery,
  SearchRowsResponse
> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly pluginService: PluginService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransactionOrPrisma();
  }

  public async execute({ data }: SearchRowsQuery): Promise<SearchRowsResponse> {
    return getOffsetPagination({
      pageData: { first: data.first || 20, after: data.after },
      findMany: async (args) => {
        return this.searchInRevision(data, args.take, args.skip);
      },
      count: async () => {
        return this.countInRevision(data);
      },
    });
  }

  private async searchInRevision(
    data: SearchRowsQueryData,
    limit: number,
    skip: number,
  ): Promise<SearchRowResult[]> {
    if (limit <= 0 || skip < 0) {
      return [];
    }

    const rows = convertRawRowsToEntities(
      await this.transaction.$queryRaw<RowWithTable[]>(
        searchRowsSql(data.revisionId, data.query, limit, skip),
      ),
    );

    if (rows.length === 0) {
      return [];
    }

    const { formulaErrors } = await this.pluginService.computeRowsFromItems(
      data.revisionId,
      rows.map(({ row, table }) => ({ tableId: table.id, row })),
    );

    return rows.map(({ row, table }) => ({
      matches: extractMatchesFallback(row.data, data.query),
      row,
      table,
      formulaErrors: formulaErrors?.get(row.id),
    }));
  }

  private async countInRevision(data: SearchRowsQueryData): Promise<number> {
    const countResult = await this.transaction.$queryRaw<[{ count: bigint }]>(
      searchRowsCountSql(data.revisionId, data.query),
    );

    return Number(countResult[0].count);
  }
}
