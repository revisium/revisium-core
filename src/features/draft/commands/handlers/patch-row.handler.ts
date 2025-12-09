import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';

type JsonValue = Prisma.JsonValue;
import {
  PatchRowCommand,
  PatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/patch-row.command';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { RowApiService } from 'src/features/row';
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
    protected readonly rowApiService: RowApiService,
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
    const row = await this.rowApiService.getRow({
      revisionId: data.revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
    });

    if (!row) {
      throw new NotFoundException(`Row not found`);
    }

    const patchedData = await this.patchRow(data, row.data);
    return this.saveRow(data, patchedData);
  }

  private async patchRow(data: PatchRowCommand['data'], rowData: JsonValue) {
    const schemaStore = await this.getSchemaStore(data);
    const rootStore = createJsonValueStore(schemaStore, data.rowId, rowData);

    for (const patch of data.patches) {
      let valueStore;
      try {
        valueStore = getJsonValueStoreByPath(rootStore, patch.path);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Path not found')
        ) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      if (valueStore instanceof JsonObjectValueStore) {
        const tempStore = createJsonObjectValueStore(
          valueStore.schema,
          data.rowId,
          patch.value as JsonObject,
        );
        valueStore.value = tempStore.value;
      } else if (valueStore instanceof JsonArrayValueStore) {
        const tempStore = createJsonArrayValueStore(
          valueStore.schema,
          data.rowId,
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
}
