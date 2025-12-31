import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionCommitCommand } from 'src/features/draft-revision/commands/impl/draft-revision-commit.command';
import { DraftRevisionCommitCommandReturnType } from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionCommitCommand)
export class DraftRevisionCommitHandler
  implements ICommandHandler<DraftRevisionCommitCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly validationService: DraftRevisionValidationService,
    private readonly internalService: DraftRevisionInternalService,
    private readonly idService: IdService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionCommitCommand): Promise<DraftRevisionCommitCommandReturnType> {
    const { branchId, comment } = data;

    const headRevision =
      await this.internalService.findHeadRevisionOrThrow(branchId);
    const draftRevision =
      await this.internalService.findDraftRevisionOrThrow(branchId);

    this.validationService.ensureHasChanges(draftRevision.hasChanges);

    const tableVersionIds =
      await this.internalService.getRevisionTableVersionIds(draftRevision.id);

    await this.updatePreviousHeadRevision(headRevision.id);
    await this.updatePreviousDraftRevision(draftRevision.id, comment);
    const nextDraftRevision = await this.createNextDraftRevision(
      branchId,
      draftRevision.id,
      tableVersionIds,
    );
    await this.lockTablesAndRows(tableVersionIds);

    return {
      previousHeadRevisionId: headRevision.id,
      previousDraftRevisionId: draftRevision.id,
      nextDraftRevisionId: nextDraftRevision.id,
    };
  }

  private updatePreviousHeadRevision(revisionId: string): Promise<unknown> {
    return this.transaction.revision.update({
      where: { id: revisionId },
      data: { isHead: false, isDraft: false, hasChanges: false },
    });
  }

  private updatePreviousDraftRevision(
    revisionId: string,
    comment?: string,
  ): Promise<unknown> {
    return this.transaction.revision.update({
      where: { id: revisionId },
      data: { isHead: true, isDraft: false, hasChanges: false, comment },
    });
  }

  private createNextDraftRevision(
    branchId: string,
    parentRevisionId: string,
    tableVersionIds: { versionId: string }[],
  ): Promise<{ id: string }> {
    return this.transaction.revision.create({
      data: {
        id: this.idService.generate(),
        isDraft: true,
        hasChanges: false,
        parent: { connect: { id: parentRevisionId } },
        tables: { connect: tableVersionIds },
        branch: { connect: { id: branchId } },
      },
      select: { id: true },
    });
  }

  private async lockTablesAndRows(
    tableVersionIds: { versionId: string }[],
  ): Promise<void> {
    if (tableVersionIds.length === 0) {
      return;
    }

    await this.transaction.table.updateMany({
      where: { OR: tableVersionIds, readonly: false },
      data: { readonly: true },
    });

    await this.transaction.row.updateMany({
      where: { readonly: false, tables: { some: { OR: tableVersionIds } } },
      data: { readonly: true },
    });
  }
}
