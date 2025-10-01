import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import { Prisma, Row } from '@prisma/client';
import {
  PatchRowCommand,
  PatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/patch-row.command';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import {
  createJsonValueStore,
  getJsonValueStoreByPath,
  createJsonArrayValueStore,
  createJsonObjectValueStore,
} from '@revisium/schema-toolkit/lib';
import {
  JsonArrayValueStore,
  JsonBooleanValueStore,
  JsonNumberValueStore,
  JsonObjectValueStore,
} from '@revisium/schema-toolkit/model';
import { JsonArray, JsonObject } from '@revisium/schema-toolkit/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(PatchRowCommand)
export class PatchRowHandler extends DraftHandler<
  PatchRowCommand,
  PatchRowCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly eventBus: EventBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: PatchRowCommand) {
    await this.eventBus.publishAll([
      new RowUpdatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
  }

  protected async handler({
    data,
  }: PatchRowCommand): Promise<PatchRowCommandReturnType> {
    const row = await this.getRow(data);
    const patchedData = await this.patchRow(data, row);
    return this.saveRow(data, patchedData);
  }

  private async patchRow(data: PatchRowCommand['data'], row: Row) {
    const schemaStore = await this.getSchemaStore(data);
    const rootStore = createJsonValueStore(schemaStore, data.rowId, row.data);

    for (const patch of data.patches) {
      const valueStore = getJsonValueStoreByPath(rootStore, patch.path);

      if (valueStore instanceof JsonObjectValueStore) {
        const tempStore = createJsonObjectValueStore(
          valueStore.schema,
          row.id,
          patch.value as JsonObject,
        );
        valueStore.value = tempStore.value;
      } else if (valueStore instanceof JsonArrayValueStore) {
        const tempStore = createJsonArrayValueStore(
          valueStore.schema,
          row.id,
          patch.value as JsonArray,
        );
        valueStore.value = tempStore.value;
      } else if (valueStore instanceof JsonBooleanValueStore) {
        valueStore.value = patch.value as boolean;
      } else if (valueStore instanceof JsonNumberValueStore) {
        valueStore.value = patch.value as number;
      } else {
        valueStore.value = patch.value as string;
      }
    }

    return rootStore.getPlainValue();
  }

  private async getSchemaStore(data: PatchRowCommand['data']) {
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    return this.jsonSchemaStore.create(schema);
  }

  private async saveRow(
    { revisionId, tableId, rowId }: PatchRowCommand['data'],
    data: Prisma.InputJsonValue,
  ) {
    return this.commandBus.execute<
      UpdateRowCommand,
      UpdateRowHandlerReturnType
    >(
      new UpdateRowCommand({
        revisionId,
        tableId,
        rowId,
        data,
      }),
    );
  }

  private async getRow(data: PatchRowCommand['data']) {
    const { versionId: tableVersionId } =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.tableId,
      );

    const { versionId: rowVersionId } =
      await this.shareTransactionalQueries.findRowInTableOrThrow(
        tableVersionId,
        data.rowId,
      );

    return this.transaction.row.findUniqueOrThrow({
      where: { versionId: rowVersionId },
    });
  }
}
