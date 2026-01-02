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
import { ApiPatchRowsCommand } from 'src/features/draft/commands/impl/api-patch-rows.command';
import { PatchRowsCommand } from 'src/features/draft/commands/impl/patch-rows.command';
import { ApiPatchRowsHandlerReturnType } from 'src/features/draft/commands/types/api-patch-rows.handler.types';
import { PatchRowsHandlerReturnType } from 'src/features/draft/commands/types/patch-rows.handler.types';
import { ShareCommands } from 'src/features/share/share.commands';
import { GetTableByIdQuery } from 'src/features/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

@CommandHandler(ApiPatchRowsCommand)
export class ApiPatchRowsHandler
  extends ApiBaseRowHandler
  implements ICommandHandler<ApiPatchRowsCommand, ApiPatchRowsHandlerReturnType>
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

  async execute({ data }: ApiPatchRowsCommand) {
    const result: PatchRowsHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(
          new PatchRowsCommand({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rows: data.rows,
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
        result.patchedRows.map((patchedRow) =>
          this.rowApi.getRowById({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rowId: patchedRow.rowId,
            rowVersionId: patchedRow.rowVersionId,
          }),
        ),
      ),
    ]);

    if (!table) {
      throw new InternalServerErrorException('Invalid ApiPatchRowsHandler');
    }

    const validRows = rows.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );

    if (validRows.length !== result.patchedRows.length) {
      throw new InternalServerErrorException(
        'Some rows were not found after patch',
      );
    }

    return {
      table,
      previousVersionTableId: result.previousTableVersionId,
      rows: validRows,
    };
  }
}
