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
import { ApiCreateRowsCommand } from 'src/features/draft/commands/impl/api-create-rows.command';
import { CreateRowsCommand } from 'src/features/draft/commands/impl/create-rows.command';
import { ApiCreateRowsHandlerReturnType } from 'src/features/draft/commands/types/api-create-rows.handler.types';
import { CreateRowsHandlerReturnType } from 'src/features/draft/commands/types/create-rows.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiCreateRowsCommand)
export class ApiCreateRowsHandler
  extends ApiBaseRowHandler
  implements
    ICommandHandler<ApiCreateRowsCommand, ApiCreateRowsHandlerReturnType>
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

  async execute({ data }: ApiCreateRowsCommand) {
    const result: CreateRowsHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(
          new CreateRowsCommand({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rows: data.rows,
            isRestore: data.isRestore,
          }),
        ),
      );

    await this.tryToNotifyEndpoints({
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      revisionId: data.revisionId,
    });

    const [table, rows] = await Promise.all([
      this.queryBus.execute<GetTableByIdQuery, GetTableByIdReturnType>(
        new GetTableByIdQuery({
          revisionId: data.revisionId,
          tableVersionId: result.tableVersionId,
        }),
      ),
      Promise.all(
        result.createdRows.map((createdRow) =>
          this.rowApi.getRowById({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rowId: createdRow.rowId,
            rowVersionId: createdRow.rowVersionId,
          }),
        ),
      ),
    ]);

    if (!table) {
      throw new InternalServerErrorException('Invalid ApiCreateRowsHandler');
    }

    const validRows = rows.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );

    if (validRows.length !== result.createdRows.length) {
      throw new InternalServerErrorException(
        'Some rows were not found after creation',
      );
    }

    return {
      table,
      previousVersionTableId: result.previousTableVersionId,
      rows: validRows,
    };
  }
}
