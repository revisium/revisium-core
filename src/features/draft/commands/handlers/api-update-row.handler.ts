import { InternalServerErrorException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { ApiBaseRowHandler } from 'src/features/draft/commands/handlers/api-base-row.handler';
import { ApiUpdateRowCommand } from 'src/features/draft/commands/impl/api-update-row.command';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/update-rows.command';
import { ApiUpdateRowHandlerReturnType } from 'src/features/draft/commands/types/api-update-row.handler.types';
import { UpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/update-rows.handler.types';
import { RowApiService } from 'src/features/row/row-api.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(ApiUpdateRowCommand)
export class ApiUpdateRowHandler
  extends ApiBaseRowHandler
  implements ICommandHandler<ApiUpdateRowCommand, ApiUpdateRowHandlerReturnType>
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

  async execute({ data }: ApiUpdateRowCommand) {
    const result: UpdateRowsHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(
          new UpdateRowsCommand({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rows: [{ rowId: data.rowId, data: data.data }],
          }),
        ),
      );

    await this.tryToNotifyEndpoints({
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      revisionId: data.revisionId,
    });

    const updatedRow = result.updatedRows[0];
    if (!updatedRow) {
      throw new InternalServerErrorException('Invalid ApiUpdateRowHandler');
    }

    const { table, row } = await this.getTableAndRow({
      revisionId: data.revisionId,
      tableVersionId: result.tableVersionId,
      tableId: data.tableId,
      rowId: data.rowId,
      rowVersionId: updatedRow.rowVersionId,
    });

    return {
      table,
      previousVersionTableId: result.previousTableVersionId,
      row,
      previousVersionRowId: updatedRow.previousRowVersionId,
    };
  }
}
