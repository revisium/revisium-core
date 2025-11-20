import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, Row, Table } from 'src/__generated__/client';
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
export class SearchRowsHandler
  implements IQueryHandler<SearchRowsQuery, SearchRowsResponse>
{
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

  private async computeRowsForTables(
    processedRows: Array<{ row: Row; table: Table }>,
    revisionId: string,
  ): Promise<void> {
    const rowsByTable = new Map<string, Row[]>();

    processedRows.forEach(({ row, table }) => {
      if (!rowsByTable.has(table.id)) {
        rowsByTable.set(table.id, []);
      }
      rowsByTable.get(table.id)?.push(row);
    });

    await Promise.all(
      Array.from(rowsByTable.entries()).map(([tableId, tableRows]) =>
        this.pluginService.computeRows({
          revisionId,
          tableId,
          rows: tableRows,
        }),
      ),
    );
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

    await this.computeRowsForTables(rows, data.revisionId);

    return rows.map(({ row, table }) => ({
      matches: extractMatchesFallback(row.data, data.query),
      row,
      table,
    }));
  }

  private async countInRevision(data: SearchRowsQueryData): Promise<number> {
    const countResult = await this.transaction.$queryRaw<[{ count: bigint }]>(
      searchRowsCountSql(data.revisionId, data.query),
    );

    return Number(countResult[0].count);
  }
}
