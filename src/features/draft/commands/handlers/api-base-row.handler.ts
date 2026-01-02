import { InternalServerErrorException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { RowApiService } from 'src/features/row/row-api.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

type RowReference = {
  rowId: string;
  rowVersionId: string;
};

type BulkRowsCommandResult = {
  tableVersionId: string;
  previousTableVersionId: string;
};

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

  protected async getTableAndRows({
    revisionId,
    tableId,
    result,
    affectedRows,
    operationName,
  }: {
    revisionId: string;
    tableId: string;
    result: BulkRowsCommandResult;
    affectedRows: RowReference[];
    operationName: string;
  }) {
    await this.tryToNotifyEndpoints({
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      revisionId,
    });

    const [table, rows] = await Promise.all([
      this.queryBus.execute<GetTableByIdQuery, GetTableByIdReturnType>(
        new GetTableByIdQuery({
          revisionId,
          tableVersionId: result.tableVersionId,
        }),
      ),
      Promise.all(
        affectedRows.map((row) =>
          this.rowApi.getRowById({
            revisionId,
            tableId,
            rowId: row.rowId,
            rowVersionId: row.rowVersionId,
          }),
        ),
      ),
    ]);

    if (!table) {
      throw new InternalServerErrorException(`Invalid ${operationName}`);
    }

    const validRows = rows.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );

    if (validRows.length !== affectedRows.length) {
      throw new InternalServerErrorException(
        `Some rows were not found after ${operationName.toLowerCase()}`,
      );
    }

    return {
      table,
      previousVersionTableId: result.previousTableVersionId,
      rows: validRows,
    };
  }
}
