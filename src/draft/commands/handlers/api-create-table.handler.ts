import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/branch/quieries/impl';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ApiCreateTableCommand } from 'src/draft/commands/impl/api-create-table.command';
import { CreateTableCommand } from 'src/draft/commands/impl/create-table.command';
import { ApiCreateTableHandlerReturnType } from 'src/draft/commands/types/api-create-table.handler.types';
import { CreateTableHandlerReturnType } from 'src/draft/commands/types/create-table.handler.types';
import { ShareCommands } from 'src/share/share.commands';
import { GetTableByIdQuery } from 'src/table/queries/impl/get-table-by-id.query';

@CommandHandler(ApiCreateTableCommand)
export class ApiCreateTableHandler
  implements
    ICommandHandler<ApiCreateTableCommand, ApiCreateTableHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiCreateTableCommand) {
    const { branchId, tableVersionId }: CreateTableHandlerReturnType =
      await this.transactionService.run(async () =>
        this.commandBus.execute<
          CreateTableCommand,
          CreateTableHandlerReturnType
        >(new CreateTableCommand(data)),
      );

    await this.shareCommands.notifyEndpoints({ revisionId: data.revisionId });

    const result: ApiCreateTableHandlerReturnType = {
      branch: await this.queryBus.execute(new GetBranchByIdQuery(branchId)),
      table: await this.queryBus.execute(
        new GetTableByIdQuery({ revisionId: data.revisionId, tableVersionId }),
      ),
    };

    return result;
  }
}
