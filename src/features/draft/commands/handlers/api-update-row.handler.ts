import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ApiUpdateRowCommand } from 'src/features/draft/commands/impl/api-update-row.command';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { ApiUpdateRowHandlerReturnType } from 'src/features/draft/commands/types/api-update-row.handler.types';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { GetRowByIdQuery } from 'src/features/row/queries/impl';
import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

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
