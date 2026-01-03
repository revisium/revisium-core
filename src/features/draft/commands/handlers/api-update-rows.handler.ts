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
            isRestore: data.isRestore,
          }),
        ),
      );

    return this.getTableAndRows({
      revisionId: data.revisionId,
      tableId: data.tableId,
      result,
      affectedRows: result.updatedRows,
      operationName: 'update',
    });
  }
}
