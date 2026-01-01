import { CommandHandler, EventBus } from '@nestjs/cqrs';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(InternalUpdateRowCommand)
export class InternalUpdateRowHandler extends DraftHandler<
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly eventBus: EventBus,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: InternalUpdateRowCommand) {
    await this.eventBus.publishAll([
      new RowUpdatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
  }

  protected async handler({
    data: input,
  }: InternalUpdateRowCommand): Promise<InternalUpdateRowCommandReturnType> {
    const result = await this.draftRevisionApi.updateRows({
      revisionId: input.revisionId,
      tableId: input.tableId,
      rows: [
        {
          rowId: input.rowId,
          data: input.data,
          schemaHash: input.schemaHash,
          meta: input.meta,
          publishedAt: input.publishedAt
            ? new Date(input.publishedAt)
            : undefined,
        },
      ],
    });

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      rowVersionId: result.updatedRows[0].rowVersionId,
      previousRowVersionId: result.updatedRows[0].previousRowVersionId,
    };
  }
}
