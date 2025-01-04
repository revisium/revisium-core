import { InternalServerErrorException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { GetRowByIdQuery } from 'src/features/row/queries/impl';
import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiCreateRowCommand)
export class ApiCreateRowHandler
  implements
    ICommandHandler<ApiCreateRowCommand, ApiCreateRowHandlerReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly shareCommands: ShareCommands,
  ) {}

  async execute({ data }: ApiCreateRowCommand) {
    const {
      tableVersionId,
      rowVersionId,
      previousTableVersionId,
    }: CreateRowHandlerReturnType = await this.transactionService.run(
      async () => this.commandBus.execute(new CreateRowCommand(data)),
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
