import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl';
import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ApiRemoveRowsCommand } from 'src/features/draft/commands/impl/api-remove-rows.command';
import { RemoveRowsCommand } from 'src/features/draft/commands/impl/remove-rows.command';
import { ApiRemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/api-remove-rows.handler.types';
import { RemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/remove-rows.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiRemoveRowsCommand)
export class ApiRemoveRowsHandler
  implements
    ICommandHandler<ApiRemoveRowsCommand, ApiRemoveRowsHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiRemoveRowsCommand) {
    const {
      branchId,
      tableVersionId,
      previousTableVersionId,
    }: RemoveRowsHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute<RemoveRowsCommand, RemoveRowsHandlerReturnType>(
          new RemoveRowsCommand(data),
        ),
      );

    if (tableVersionId !== previousTableVersionId) {
      await this.shareCommands.notifyEndpoints({ revisionId: data.revisionId });
    }

    const [branch, table] = await Promise.all([
      this.queryBus.execute<GetBranchByIdQuery, GetBranchByIdReturnType>(
        new GetBranchByIdQuery(branchId),
      ),
      ...(tableVersionId
        ? [
            this.queryBus.execute<GetTableByIdQuery, GetTableByIdReturnType>(
              new GetTableByIdQuery({
                revisionId: data.revisionId,
                tableVersionId,
              }),
            ),
          ]
        : []),
    ]);

    const result: ApiRemoveRowsHandlerReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      branch,
    };

    return result;
  }
}
