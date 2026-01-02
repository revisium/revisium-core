import { InternalServerErrorException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { ApiBaseRowHandler } from 'src/features/draft/commands/handlers/api-base-row.handler';
import { RowApiService } from 'src/features/row/row-api.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ApiUpdateRowsCommand } from 'src/features/draft/commands/impl/api-update-rows.command';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/update-rows.command';
import { ApiUpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/api-update-rows.handler.types';
import { UpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/update-rows.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiUpdateRowsCommand)
export class ApiUpdateRowsHandler
  extends ApiBaseRowHandler
  implements
    ICommandHandler<ApiUpdateRowsCommand, ApiUpdateRowsHandlerReturnType>
{
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly queryBus: QueryBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly shareCommands: ShareCommands,
    protected readonly rowApi: RowApiService,
  ) {
    super(queryBus, shareCommands, rowApi);
  }

  async execute({ data }: ApiUpdateRowsCommand) {
    const result: UpdateRowsHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(
          new UpdateRowsCommand({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rows: data.rows,
          }),
        ),
      );

    await this.tryToNotifyEndpoints({
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      revisionId: data.revisionId,
    });

    const [table, rows] = await Promise.all([
      this.queryBus.execute<GetTableByIdQuery, GetTableByIdReturnType>(
        new GetTableByIdQuery({
          revisionId: data.revisionId,
          tableVersionId: result.tableVersionId,
        }),
      ),
      Promise.all(
        result.updatedRows.map((updatedRow) =>
          this.rowApi.getRowById({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rowId: updatedRow.rowId,
            rowVersionId: updatedRow.rowVersionId,
          }),
        ),
      ),
    ]);

    if (!table) {
      throw new InternalServerErrorException('Invalid ApiUpdateRowsHandler');
    }

    const validRows = rows.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );

    if (validRows.length !== result.updatedRows.length) {
      throw new InternalServerErrorException(
        'Some rows were not found after update',
      );
    }

    return {
      table,
      previousVersionTableId: result.previousTableVersionId,
      rows: validRows,
    };
  }
}
