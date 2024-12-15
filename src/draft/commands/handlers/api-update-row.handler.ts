import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ApiUpdateRowCommand } from 'src/draft/commands/impl/api-update-row.command';
import { UpdateRowCommand } from 'src/draft/commands/impl/update-row.command';
import { ApiUpdateRowHandlerReturnType } from 'src/draft/commands/types/api-update-row.handler.types';
import { UpdateRowHandlerReturnType } from 'src/draft/commands/types/update-row.handler.types';
import { GetRowByIdQuery } from 'src/row/queries/impl';
import { GetRowByIdReturnType } from 'src/row/queries/types';
import { ShareCommands } from 'src/share/share.commands';
import { GetTableByIdQuery } from 'src/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/table/queries/types';

@CommandHandler(ApiUpdateRowCommand)
export class ApiUpdateRowHandler
  implements
    ICommandHandler<ApiUpdateRowCommand, ApiUpdateRowHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiUpdateRowCommand) {
    const {
      tableVersionId,
      previousTableVersionId,
      rowVersionId,
      previousRowVersionId,
    }: UpdateRowHandlerReturnType = await this.transactionService.run(
      async () => this.commandBus.execute(new UpdateRowCommand(data)),
    );

    if (tableVersionId !== previousTableVersionId) {
      await this.shareCommands.notifyEndpoints({ revisionId: data.revisionId });
    }

    const [table, row] = await Promise.all([
      this.queryBus.execute<GetTableByIdQuery, GetTableByIdReturnType>(
        new GetTableByIdQuery({ revisionId: data.revisionId, tableVersionId }),
      ),
      this.queryBus.execute<GetRowByIdQuery, GetRowByIdReturnType>(
        new GetRowByIdQuery({
          revisionId: data.revisionId,
          tableId: data.tableId,
          rowVersionId,
        }),
      ),
    ]);

    const result: ApiUpdateRowHandlerReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      row,
      previousVersionRowId: previousRowVersionId,
    };

    return result;
  }
}
