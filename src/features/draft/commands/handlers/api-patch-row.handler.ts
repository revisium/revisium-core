import { InternalServerErrorException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { ApiBaseRowHandler } from 'src/features/draft/commands/handlers/api-base-row.handler';
import {
  ApiPatchRowCommand,
  ApiPatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-patch-row.command';
import { PatchRowsCommand } from 'src/features/draft/commands/impl/patch-rows.command';
import { PatchRowsHandlerReturnType } from 'src/features/draft/commands/types/patch-rows.handler.types';
import { RowApiService } from 'src/features/row/row-api.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(ApiPatchRowCommand)
export class ApiPatchRowHandler
  extends ApiBaseRowHandler
  implements ICommandHandler<ApiPatchRowCommand, ApiPatchRowCommandReturnType>
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

  async execute({ data }: ApiPatchRowCommand) {
    const result: PatchRowsHandlerReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(
          new PatchRowsCommand({
            revisionId: data.revisionId,
            tableId: data.tableId,
            rows: [{ rowId: data.rowId, patches: data.patches }],
          }),
        ),
      );

    await this.tryToNotifyEndpoints({
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      revisionId: data.revisionId,
    });

    const patchedRow = result.patchedRows[0];
    if (!patchedRow) {
      throw new InternalServerErrorException('Invalid ApiPatchRowHandler');
    }

    const { table, row } = await this.getTableAndRow({
      revisionId: data.revisionId,
      tableVersionId: result.tableVersionId,
      tableId: data.tableId,
      rowId: data.rowId,
      rowVersionId: patchedRow.rowVersionId,
    });

    return {
      table,
      previousVersionTableId: result.previousTableVersionId,
      row,
      previousVersionRowId: patchedRow.previousRowVersionId,
    };
  }
}
