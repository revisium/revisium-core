import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl';
import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ApiRemoveTableCommand } from 'src/features/draft/commands/impl/api-remove-table.command';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { ApiRemoveTableHandlerReturnType } from 'src/features/draft/commands/types/api-remove-table.handler.types';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';

@CommandHandler(ApiRemoveTableCommand)
export class ApiRemoveTableHandler implements ICommandHandler<
  ApiRemoveTableCommand,
  ApiRemoveTableHandlerReturnType
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiRemoveTableCommand) {
    const { branchId }: RemoveTableHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
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
