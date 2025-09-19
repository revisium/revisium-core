import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { ApiBaseRowHandler } from 'src/features/draft/commands/handlers/api-base-row.handler';
import {
  ApiPatchRowCommand,
  ApiPatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-patch-row.command';
import {
  PatchRowCommand,
  PatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/patch-row.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(ApiPatchRowCommand)
export class ApiPatchRowHandler
  extends ApiBaseRowHandler
  implements ICommandHandler<ApiPatchRowCommand, ApiPatchRowCommandReturnType>
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

  async execute({ data }: ApiPatchRowCommand) {
    const {
      tableVersionId,
      previousTableVersionId,
      rowVersionId,
      previousRowVersionId,
    }: PatchRowCommandReturnType = await this.transactionService.run(async () =>
      this.commandBus.execute(new PatchRowCommand(data)),
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

    const result: ApiPatchRowCommandReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      row,
      previousVersionRowId: previousRowVersionId,
    };

    return result;
  }
}
