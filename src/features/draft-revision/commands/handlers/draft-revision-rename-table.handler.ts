import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionRenameTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-rename-table.command';
import { DraftRevisionRenameTableCommandReturnType } from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionRenameTableCommand)
export class DraftRevisionRenameTableHandler
  implements ICommandHandler<DraftRevisionRenameTableCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly validationService: DraftRevisionValidationService,
    private readonly internalService: DraftRevisionInternalService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionRenameTableCommand): Promise<DraftRevisionRenameTableCommandReturnType> {
    const { revisionId, tableId, nextTableId } = data;

    const revision = await this.internalService.findRevisionOrThrow(revisionId);
    this.validationService.ensureDraftRevision(revision);
    this.validationService.ensureValidTableId(nextTableId);
    this.validationService.ensureIdsDifferent(tableId, nextTableId);
    await this.internalService.ensureTableNotExists(revisionId, nextTableId);

    const getOrCreateResult = await this.internalService.getOrCreateDraftTable({
      revisionId,
      tableId,
    });

    await this.renameTable(getOrCreateResult.tableVersionId, nextTableId);

    await this.internalService.markRevisionAsChanged(revisionId);

    return {
      tableVersionId: getOrCreateResult.tableVersionId,
      previousTableVersionId: getOrCreateResult.previousTableVersionId,
    };
  }

  private async renameTable(
    tableVersionId: string,
    nextTableId: string,
  ): Promise<void> {
    await this.transaction.table.update({
      where: { versionId: tableVersionId },
      data: { id: nextTableId },
    });
  }
}
