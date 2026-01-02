import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
type JsonValue = Prisma.JsonValue;
import {
  PatchRowsCommand,
  PatchRowsRowInput,
} from 'src/features/draft/commands/impl/patch-rows.command';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/update-rows.command';
import { PatchRowsHandlerReturnType } from 'src/features/draft/commands/types/patch-rows.handler.types';
import { UpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/update-rows.handler.types';
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
  JsonSchemaStore,
} from '@revisium/schema-toolkit/model';
import { JsonArray, JsonObject } from '@revisium/schema-toolkit/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(PatchRowsCommand)
export class PatchRowsHandler extends DraftHandler<
  PatchRowsCommand,
  PatchRowsHandlerReturnType
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

  protected async postActions({ data }: PatchRowsCommand) {
    const events = data.rows.map(
      (row) => new RowUpdatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
  }

  protected async handler({
    data,
  }: PatchRowsCommand): Promise<PatchRowsHandlerReturnType> {
    if (!data.rows.length) {
      throw new BadRequestException('rows array cannot be empty');
    }

    const schemaStore = await this.getSchemaStore(data);
    const patchedRows = await this.patchAllRows(data, schemaStore);

    const result = await this.commandBus.execute<
      UpdateRowsCommand,
      UpdateRowsHandlerReturnType
    >(
      new UpdateRowsCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rows: patchedRows,
      }),
    );

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      patchedRows: result.updatedRows.map((row, index) => ({
        rowId: data.rows[index].rowId,
        rowVersionId: row.rowVersionId,
        previousRowVersionId: row.previousRowVersionId,
      })),
    };
  }

  private async patchAllRows(
    data: PatchRowsCommand['data'],
    schemaStore: JsonSchemaStore,
  ): Promise<Array<{ rowId: string; data: Prisma.InputJsonValue }>> {
    const rowIds = data.rows.map((r) => r.rowId);

    const result = await this.rowApiService.getRows({
      revisionId: data.revisionId,
      tableId: data.tableId,
      first: rowIds.length,
      where: { id: { in: rowIds } },
    });

    const rowMap = new Map(
      result.edges.map((edge) => [edge.node.id, edge.node]),
    );

    const missingRows = rowIds.filter((id) => !rowMap.has(id));
    if (missingRows.length > 0) {
      throw new NotFoundException(`Rows not found: ${missingRows.join(', ')}`);
    }

    return data.rows.map((rowInput) => {
      const row = rowMap.get(rowInput.rowId)!;
      const patchedData = this.applyPatches(
        schemaStore,
        rowInput.rowId,
        row.data,
        rowInput.patches,
      );
      return { rowId: rowInput.rowId, data: patchedData };
    });
  }

  private applyPatches(
    schemaStore: JsonSchemaStore,
    rowId: string,
    rowData: JsonValue,
    patches: PatchRowsRowInput['patches'],
  ): Prisma.InputJsonValue {
    const rootStore = createJsonValueStore(schemaStore, rowId, rowData);

    for (const patch of patches) {
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
          rowId,
          patch.value as JsonObject,
        );
        valueStore.value = tempStore.value;
      } else if (valueStore instanceof JsonArrayValueStore) {
        const tempStore = createJsonArrayValueStore(
          valueStore.schema,
          rowId,
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

  private async getSchemaStore(data: PatchRowsCommand['data']) {
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    return this.jsonSchemaStore.create(schema);
  }
}
