import { InternalServerErrorException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ApiCreateRowCommand } from 'src/draft/commands/impl/api-create-row.command';
import { CreateRowCommand } from 'src/draft/commands/impl/create-row.command';
import { ApiCreateRowHandlerReturnType } from 'src/draft/commands/types/api-create-row.handler.types';
import { CreateRowHandlerReturnType } from 'src/draft/commands/types/create-row.handler.types';
import { GetRowByIdQuery } from 'src/row/queries/impl';
import { GetRowByIdReturnType } from 'src/row/queries/types';
import { ShareCommands } from 'src/share/share.commands';
import { GetTableByIdQuery } from 'src/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/table/queries/types';

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
