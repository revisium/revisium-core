import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
type JsonValue = Prisma.JsonValue;
import {
  CreateRowsCommand,
  CreateRowsRowInput,
} from 'src/features/draft/commands/impl/create-rows.command';
import { CreateRowsHandlerReturnType } from 'src/features/draft/commands/types/create-rows.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { RowPublishedAtPlugin } from 'src/features/plugin/row-published-at/row-published-at.plugin';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
import { validateRowId } from 'src/features/share/utils/validateUrlLikeId/validateRowId';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RowCreatedEvent } from 'src/infrastructure/cache';

@CommandHandler(CreateRowsCommand)
export class CreateRowsHandler extends DraftHandler<
  CreateRowsCommand,
  CreateRowsHandlerReturnType
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

  protected async postActions({ data }: CreateRowsCommand) {
    const events = data.rows.map(
      (row) => new RowCreatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
  }

  protected async handler({
    data: input,
  }: CreateRowsCommand): Promise<CreateRowsHandlerReturnType> {
    const { revisionId, tableId, rows } = input;

    if (!rows.length) {
      throw new BadRequestException('rows array cannot be empty');
    }

    for (const row of rows) {
      validateRowId(row.rowId);
    }

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    const { schemaHash } = await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows,
    });

    const processedRows = await this.processRows(input, schemaHash);

    const result = await this.draftRevisionApi.createRows({
      revisionId,
      tableId,
      rows: processedRows,
    });

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      createdRows: result.createdRows.map((row, index) => ({
        rowId: rows[index].rowId,
        rowVersionId: row.rowVersionId,
      })),
    };
  }

  private async processRows(
    input: CreateRowsCommand['data'],
    schemaHash: string,
  ) {
    const { schemaStore } = await this.pluginService.prepareSchemaContext({
      revisionId: input.revisionId,
      tableId: input.tableId,
    });

    const processedRows = [];

    for (const row of input.rows) {
      const processedData = await this.pluginService.afterCreateRow({
        revisionId: input.revisionId,
        tableId: input.tableId,
        rowId: row.rowId,
        data: row.data,
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
    data: CreateRowsRowInput['data'],
  ): string | undefined {
    const valueStore = createJsonValueStore(
      schemaStore,
      rowId,
      data as JsonValue,
    );
    const publishedAt = this.rowPublishedAtPlugin.getPublishedAt(valueStore);

    if (publishedAt === '') {
      return undefined;
    }

    return publishedAt;
  }
}
