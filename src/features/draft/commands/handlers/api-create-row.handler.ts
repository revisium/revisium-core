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
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';

@CommandHandler(ApiCreateRowCommand)
export class ApiCreateRowHandler
  extends ApiBaseRowHandler
  implements ICommandHandler<ApiCreateRowCommand, ApiCreateRowHandlerReturnType>
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

  async execute({ data }: ApiCreateRowCommand) {
    const {
      tableVersionId,
      rowVersionId,
      previousTableVersionId,
    }: CreateRowHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(new CreateRowCommand(data)),
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

    if (!table || !row) {
      throw new InternalServerErrorException('Invalid ApiCreateRowHandler');
    }

    const result: ApiCreateRowHandlerReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      row: row,
    };

    return result;
  }
}
