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
import { RowPublishedAtPlugin } from 'src/features/plugin/row-published-at/row-published-at.plugin';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

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
    protected readonly rowPublishedAtPlugin: RowPublishedAtPlugin,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
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

  private async getFirstPublishedAtFromDataOrUndefined(
    data: UpdateRowCommand['data'],
  ): Promise<string | undefined> {
    const { schemaStore } = await this.pluginService.prepareSchemaContext({
      revisionId: data.revisionId,
      tableId: data.tableId,
    });

    const valueStore = createJsonValueStore(
      schemaStore,
      data.rowId,
      data.data as JsonValue,
    );
    return this.rowPublishedAtPlugin.getPublishedAt(valueStore);
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
        publishedAt: await this.getFirstPublishedAtFromDataOrUndefined(data),
      }),
    );
  }
}
