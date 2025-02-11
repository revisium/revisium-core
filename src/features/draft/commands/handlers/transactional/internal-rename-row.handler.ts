import { CommandHandler } from '@nestjs/cqrs';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(InternalRenameRowCommand)
export class InternalRenameRowHandler extends DraftHandler<
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
  ) {
    super(transactionService, draftContext);
  }

  public async handler({
    data: input,
  }: InternalRenameRowCommand): Promise<InternalRenameRowCommandReturnType> {
    const { revisionId, tableId, rowId } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRow(rowId);

    await this.renameDraftRow(input);

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
      rowVersionId: this.rowRequestDto.versionId,
      previousRowVersionId: this.rowRequestDto.previousVersionId,
    };
  }

  private async renameDraftRow(input: InternalRenameRowCommand['data']) {
    return this.transaction.row.update({
      where: {
        versionId: this.rowRequestDto.versionId,
      },
      data: {
        id: input.nextRowId,
      },
      select: {
        versionId: true,
      },
    });
  }
}
