import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ApiUpdateTableCommand } from 'src/features/draft/commands/impl/api-update-table.command';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { ApiUpdateTableHandlerReturnType } from 'src/features/draft/commands/types/api-update-table.handler.types';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiUpdateTableCommand)
export class ApiUpdateTableHandler
  implements
    ICommandHandler<ApiUpdateTableCommand, ApiUpdateTableHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiUpdateTableCommand) {
    const {
      tableVersionId,
      previousTableVersionId,
    }: UpdateTableHandlerReturnType = await this.transactionService.run(
      async () =>
        this.commandBus.execute<
          UpdateTableCommand,
          UpdateTableHandlerReturnType
        >(new UpdateTableCommand(data)),
    );

    await this.shareCommands.notifyEndpoints({ revisionId: data.revisionId });

    const table = await this.queryBus.execute<
      GetTableByIdQuery,
      GetTableByIdReturnType
    >(new GetTableByIdQuery({ revisionId: data.revisionId, tableVersionId }));

    const result: ApiUpdateTableHandlerReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
    };

    return result;
  }
}
