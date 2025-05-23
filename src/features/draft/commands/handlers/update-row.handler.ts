import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { PluginService } from 'src/features/plugin/plugin.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(UpdateRowCommand)
export class UpdateRowHandler extends DraftHandler<
  UpdateRowCommand,
  UpdateRowHandlerReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly pluginService: PluginService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: UpdateRowCommand): Promise<UpdateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, data } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    const { schemaHash } = await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
    });
    await this.updateRevision(revisionId);

    return this.updateRow(input, schemaHash);
  }

  private async updateRevision(revisionId: string) {
    return this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: {
        hasChanges: true,
      },
    });
  }

  private async updateRow(data: UpdateRowCommand['data'], schemaHash: string) {
    return this.commandBus.execute<
      InternalUpdateRowCommand,
      InternalUpdateRowCommandReturnType
    >(
      new InternalUpdateRowCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rowId: data.rowId,
        data: await this.pluginService.afterUpdateRow(data),
        schemaHash,
      }),
    );
  }
}
