import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { ApiBaseRowHandler } from 'src/features/draft/commands/handlers/api-base-row.handler';
import {
  ApiRenameRowCommand,
  ApiRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-row.command';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ShareCommands } from 'src/features/share/share.commands';

@CommandHandler(ApiRenameRowCommand)
export class ApiRenameRowHandler
  extends ApiBaseRowHandler
  implements ICommandHandler<ApiRenameRowCommand, ApiRenameRowCommandReturnType>
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

  async execute({ data }: ApiRenameRowCommand) {
    const {
      tableVersionId,
      previousTableVersionId,
      rowVersionId,
      previousRowVersionId,
    }: RenameRowCommandReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(new RenameRowCommand(data)),
      );

    await this.tryToNotifyEndpoints({
      tableVersionId,
      previousTableVersionId,
      revisionId: data.revisionId,
    });

    const { table, row } = await this.getTableAndRow({
      revisionId: data.revisionId,
      tableVersionId,
      tableId: data.tableId,
      rowId: data.rowId,
      rowVersionId,
    });

    const result: ApiRenameRowCommandReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      row,
      previousVersionRowId: previousRowVersionId,
    };

    return result;
  }
}
