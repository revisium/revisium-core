import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/branch/quieries/impl';
import { GetBranchByIdReturnType } from 'src/branch/quieries/types/get-branch-by-id.types';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ApiRemoveRowCommand } from 'src/draft/commands/impl/api-remove-row.command';
import { RemoveRowCommand } from 'src/draft/commands/impl/remove-row.command';
import { ApiRemoveRowHandlerReturnType } from 'src/draft/commands/types/api-remove-row.handler.types';
import { RemoveRowHandlerReturnType } from 'src/draft/commands/types/remove-row.handler.types';
import { ShareCommands } from 'src/share/share.commands';
import { GetTableByIdQuery } from 'src/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/table/queries/types';

@CommandHandler(ApiRemoveRowCommand)
export class ApiRemoveRowHandler
  implements
    ICommandHandler<ApiRemoveRowCommand, ApiRemoveRowHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiRemoveRowCommand) {
    const {
      branchId,
      tableVersionId,
      previousTableVersionId,
    }: RemoveRowHandlerReturnType = await this.transactionService.run(
      async () =>
        this.commandBus.execute<RemoveRowCommand, RemoveRowHandlerReturnType>(
          new RemoveRowCommand(data),
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

    const result: ApiRemoveRowHandlerReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      branch,
    };

    return result;
  }
}