import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
type JsonValue = Prisma.JsonValue;
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { PluginService } from 'src/features/plugin/plugin.service';
import { RowPublishedAtPlugin } from 'src/features/plugin/row-published-at/row-published-at.plugin';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { validateRowId } from 'src/features/share/utils/validateUrlLikeId/validateRowId';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RowCreatedEvent } from 'src/infrastructure/cache';

@CommandHandler(CreateRowCommand)
export class CreateRowHandler extends DraftHandler<
  CreateRowCommand,
  CreateRowHandlerReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly eventBus: EventBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly pluginService: PluginService,
    protected readonly rowPublishedAtPlugin: RowPublishedAtPlugin,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: CreateRowCommand) {
    await this.eventBus.publishAll([
      new RowCreatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
  }

  protected async handler({
    data: input,
  }: CreateRowCommand): Promise<CreateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, data } = input;

    validateRowId(rowId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    const { schemaHash } = await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
    });

    return this.createRow(input, schemaHash);
  }

  private async getFirstPublishedAtFromDataOrUndefined(
    data: CreateRowCommand['data'],
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

    const publishedAt = this.rowPublishedAtPlugin.getPublishedAt(valueStore);

    if (publishedAt === '') {
      return undefined;
    }

    return publishedAt;
  }

  private async createRow(data: CreateRowCommand['data'], schemaHash: string) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(
      new InternalCreateRowCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rowId: data.rowId,
        data: await this.pluginService.afterCreateRow(data),
        schemaHash,
        publishedAt: await this.getFirstPublishedAtFromDataOrUndefined(data),
      }),
    );
  }
}
