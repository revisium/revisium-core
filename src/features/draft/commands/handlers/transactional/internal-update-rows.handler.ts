import { CommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  InternalUpdateRowsCommand,
  InternalUpdateRowsCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-rows.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(InternalUpdateRowsCommand)
export class InternalUpdateRowsHandler extends DraftHandler<
  InternalUpdateRowsCommand,
  InternalUpdateRowsCommandReturnType
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
  }: InternalUpdateRowsCommand): Promise<InternalUpdateRowsCommandReturnType> {
    const { revisionId, tableId, rows, schemaHash } = input;

    const result = await this.draftRevisionApi.updateRows({
      revisionId,
      tableId,
      rows: rows.map((row) => ({
        rowId: row.rowId,
        data: row.data,
        schemaHash,
      })),
    });

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
    };
  }
}
