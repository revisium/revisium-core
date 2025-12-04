import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { ApiBaseRowHandler } from 'src/features/draft/commands/handlers/api-base-row.handler';
import {
  ApiUploadFileCommand,
  ApiUploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/api-upload-file.command';
import {
  UploadFileCommand,
  UploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/update-file.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { ShareCommands } from 'src/features/share/share.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(ApiUploadFileCommand)
export class ApiUploadFileHandler
  extends ApiBaseRowHandler
  implements
    ICommandHandler<ApiUploadFileCommand, ApiUploadFileCommandReturnType>
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

  async execute({ data }: ApiUploadFileCommand) {
    const {
      tableVersionId,
      previousTableVersionId,
      rowVersionId,
      previousRowVersionId,
    }: UploadFileCommandReturnType =
      await this.transactionService.runSerializable(async () =>
        this.commandBus.execute(new UploadFileCommand(data)),
      );

    await this.tryToNotifyEndpoints({
      tableVersionId,
      previousTableVersionId,
      revisionId: data.revisionId,
    });

    const { table, row } = await this.getTableAndRow({
      revisionId: data.revisionId,
      tableVersionId,
      tableId: data.tableId,
      rowId: data.rowId,
      rowVersionId,
    });

    const result: ApiUploadFileCommandReturnType = {
      table,
      previousVersionTableId: previousTableVersionId,
      row,
      previousVersionRowId: previousRowVersionId,
    };

    return result;
  }
}
