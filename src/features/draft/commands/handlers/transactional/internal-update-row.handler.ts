import { CommandHandler, EventBus } from '@nestjs/cqrs';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(InternalUpdateRowCommand)
export class InternalUpdateRowHandler extends DraftHandler<
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly hashService: HashService,
    protected readonly eventBus: EventBus,
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
    const { revisionId, tableId, rowId } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRow(rowId);

    await this.updateDraftRow(input);

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
      rowVersionId: this.rowRequestDto.versionId,
      previousRowVersionId: this.rowRequestDto.previousVersionId,
    };
  }

  private async updateDraftRow(input: InternalUpdateRowCommand['data']) {
    return this.transaction.row.update({
      where: {
        versionId: this.rowRequestDto.versionId,
      },
      data: {
        updatedAt: new Date(),
        data: input.data,
        meta: input.meta,
        publishedAt: input.publishedAt,
        hash: await this.hashService.hashObject(input.data),
        schemaHash: input.schemaHash,
      },
      select: {
        versionId: true,
      },
    });
  }
}
