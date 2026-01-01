import { CommandHandler } from '@nestjs/cqrs';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(InternalCreateRowCommand)
export class InternalCreateRowHandler extends DraftHandler<
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: InternalCreateRowCommand): Promise<InternalCreateRowCommandReturnType> {
    const { revisionId, tableId, rowId, data, schemaHash, meta, publishedAt } =
      input;

    const result = await this.draftRevisionApi.createRows({
      revisionId,
      tableId,
      rows: [
        {
          rowId,
          data,
          schemaHash,
          meta,
          publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        },
      ],
    });

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      rowVersionId: result.createdRows[0].rowVersionId,
    };
  }
}
