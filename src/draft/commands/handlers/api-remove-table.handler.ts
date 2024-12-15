import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/branch/quieries/impl';
import { GetBranchByIdReturnType } from 'src/branch/quieries/types/get-branch-by-id.types';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ApiRemoveTableCommand } from 'src/draft/commands/impl/api-remove-table.command';
import { RemoveTableCommand } from 'src/draft/commands/impl/remove-table.command';
import { ApiRemoveTableHandlerReturnType } from 'src/draft/commands/types/api-remove-table.handler.types';
import { RemoveTableHandlerReturnType } from 'src/draft/commands/types/remove-table.handler.types';
import { ShareCommands } from 'src/share/share.commands';

@CommandHandler(ApiRemoveTableCommand)
export class ApiRemoveTableHandler
  implements
    ICommandHandler<ApiRemoveTableCommand, ApiRemoveTableHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiRemoveTableCommand) {
    const { branchId }: RemoveTableHandlerReturnType =
      await this.transactionService.run(async () =>
        this.commandBus.execute<
          RemoveTableCommand,
          RemoveTableHandlerReturnType
        >(new RemoveTableCommand(data)),
      );

    await this.shareCommands.notifyEndpoints({ revisionId: data.revisionId });

    const result: ApiRemoveTableHandlerReturnType = {
      branch: await this.queryBus.execute<
        GetBranchByIdQuery,
        GetBranchByIdReturnType
      >(new GetBranchByIdQuery(branchId)),
    };

    return result;
  }
}
