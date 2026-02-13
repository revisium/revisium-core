import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  GetTableViewsQuery,
  GetTableViewsQueryReturnType,
} from 'src/features/views/queries/impl';
import {
  CURRENT_VIEWS_VERSION,
  DEFAULT_VIEW_ID,
  TableViewsData,
} from 'src/features/views/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetTableViewsQuery)
export class GetTableViewsHandler implements IQueryHandler<
  GetTableViewsQuery,
  GetTableViewsQueryReturnType
> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransactionOrPrisma();
  }

  public async execute({
    data,
  }: GetTableViewsQuery): Promise<GetTableViewsQueryReturnType> {
    const viewsTable = await this.shareTransactionalQueries.findTableInRevision(
      data.revisionId,
      SystemTables.Views,
    );

    if (!viewsTable) {
      return this.createDefaultTableViewsData();
    }

    const row = await this.findViewsRow(viewsTable.versionId, data.tableId);

    if (!row) {
      return this.createDefaultTableViewsData();
    }

    return row.data as unknown as TableViewsData;
  }

  private createDefaultTableViewsData(): TableViewsData {
    return {
      version: CURRENT_VIEWS_VERSION,
      defaultViewId: DEFAULT_VIEW_ID,
      views: [
        {
          id: DEFAULT_VIEW_ID,
          name: 'Default',
          columns: null,
          sorts: [],
          search: '',
        },
      ],
    };
  }

  private async findViewsRow(tableVersionId: string, rowId: string) {
    return this.transaction.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: tableVersionId,
          },
        },
      },
    });
  }
}
