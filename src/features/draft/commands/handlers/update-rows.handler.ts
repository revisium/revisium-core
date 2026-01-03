import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
type JsonValue = Prisma.JsonValue;
import {
  UpdateRowsCommand,
  UpdateRowsRowInput,
} from 'src/features/draft/commands/impl/update-rows.command';
import { UpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/update-rows.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { RowPublishedAtPlugin } from 'src/features/plugin/row-published-at/row-published-at.plugin';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RowUpdatedEvent } from 'src/infrastructure/cache';

@CommandHandler(UpdateRowsCommand)
export class UpdateRowsHandler extends DraftHandler<
  UpdateRowsCommand,
  UpdateRowsHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly eventBus: EventBus,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly draftRevisionApi: DraftRevisionApiService,
    protected readonly pluginService: PluginService,
    protected readonly rowPublishedAtPlugin: RowPublishedAtPlugin,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: UpdateRowsCommand) {
    const events = data.rows.map(
      (row) => new RowUpdatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
  }

  protected async handler({
    data: input,
  }: UpdateRowsCommand): Promise<UpdateRowsHandlerReturnType> {
    const { revisionId, tableId, rows } = input;

    if (!rows.length) {
      throw new BadRequestException('rows array cannot be empty');
    }

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    const { schemaHash } = await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows,
    });

    const processedRows = await this.processRows(input, schemaHash);

    const result = await this.draftRevisionApi.updateRows({
      revisionId,
      tableId,
      rows: processedRows,
    });

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      updatedRows: result.updatedRows.map((row, index) => ({
        rowId: rows[index].rowId,
        rowVersionId: row.rowVersionId,
        previousRowVersionId: row.previousRowVersionId,
      })),
    };
  }

  private async processRows(
    input: UpdateRowsCommand['data'],
    schemaHash: string,
  ) {
    const { schemaStore } = await this.pluginService.prepareSchemaContext({
      revisionId: input.revisionId,
      tableId: input.tableId,
    });

    const processedRows = [];

    for (const row of input.rows) {
      const processedData = await this.pluginService.afterUpdateRow({
        revisionId: input.revisionId,
        tableId: input.tableId,
        rowId: row.rowId,
        data: row.data,
        isRestore: input.isRestore,
      });

      const publishedAt = this.getPublishedAtFromData(
        schemaStore,
        row.rowId,
        row.data,
      );

      processedRows.push({
        rowId: row.rowId,
        data: processedData,
        schemaHash,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      });
    }

    return processedRows;
  }

  private getPublishedAtFromData(
    schemaStore: JsonSchemaStore,
    rowId: string,
    data: UpdateRowsRowInput['data'],
  ): string | undefined {
    const valueStore = createJsonValueStore(
      schemaStore,
      rowId,
      data as JsonValue,
    );
    return this.rowPublishedAtPlugin.getPublishedAt(valueStore);
  }
}
