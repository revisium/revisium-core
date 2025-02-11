import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import {
  ApiRenameRowCommand,
  ApiRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-row.command';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetRowByIdQuery } from 'src/features/row/queries/impl';
import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiRenameRowCommand)
export class ApiRenameRowHandler
  implements
    ICommandHandler<ApiRenameRowCommand, ApiRenameRowCommandReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiRenameRowCommand) {
    const {
      tableVersionId,
      previousTableVersionId,
      rowVersionId,
      previousRowVersionId,
    }: RenameRowCommandReturnType = await this.transactionService.run(
      async () => this.commandBus.execute(new RenameRowCommand(data)),
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

    const result: ApiRenameRowCommandReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      row,
      previousVersionRowId: previousRowVersionId,
    };

    return result;
  }
}
