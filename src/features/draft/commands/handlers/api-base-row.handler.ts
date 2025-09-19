import { QueryBus } from '@nestjs/cqrs';
import { RowApiService } from 'src/features/row/row-api.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export class ApiBaseRowHandler {
  constructor(
    protected readonly queryBus: QueryBus,
    protected readonly shareCommands: ShareCommands,
    protected readonly rowApi: RowApiService,
  ) {}

  protected async tryToNotifyEndpoints({
    tableVersionId,
    previousTableVersionId,
    revisionId,
  }: {
    tableVersionId: string;
    previousTableVersionId: string;
    revisionId: string;
  }) {
    if (tableVersionId !== previousTableVersionId) {
      await this.shareCommands.notifyEndpoints({ revisionId });
    }
  }

  protected async getTableAndRow({
    revisionId,
    tableId,
    tableVersionId,
    rowId,
    rowVersionId,
  }: {
    revisionId: string;
    tableId: string;
    tableVersionId: string;
    rowId: string;
    rowVersionId: string;
  }) {
    const [table, row] = await Promise.all([
      this.queryBus.execute<GetTableByIdQuery, GetTableByIdReturnType>(
        new GetTableByIdQuery({ revisionId: revisionId, tableVersionId }),
      ),
      this.rowApi.getRowById({
        revisionId: revisionId,
        tableId: tableId,
        rowId,
        rowVersionId,
      }),
    ]);

    return { table, row };
  }
}
