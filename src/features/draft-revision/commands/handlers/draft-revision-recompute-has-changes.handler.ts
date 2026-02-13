import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionRecomputeHasChangesCommand } from 'src/features/draft-revision/commands/impl';
import { DiffService } from 'src/features/share/diff.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionRecomputeHasChangesCommand)
export class DraftRevisionRecomputeHasChangesHandler implements ICommandHandler<DraftRevisionRecomputeHasChangesCommand> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly diffService: DiffService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionRecomputeHasChangesCommand): Promise<void> {
    const { revisionId, tableId } = data;

    const revision = await this.transaction.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: { parentId: true, branchId: true },
    });

    if (!revision.parentId) {
      return;
    }

    const table = await this.shareTransactionalQueries.findTableInRevision(
      revisionId,
      tableId,
    );

    if (!table) {
      await this.updateRevisionHasChanges(revisionId, revision.parentId);
      return;
    }

    const hasRowChanges = await this.diffService.hasRowDiffs({
      tableCreatedId: table.createdId,
      fromRevisionId: revision.parentId,
      toRevisionId: revisionId,
    });

    if (!hasRowChanges) {
      await this.revertTable(revision.branchId, tableId);
    }

    await this.updateRevisionHasChanges(revisionId, revision.parentId);
  }

  private async revertTable(branchId: string, tableId: string): Promise<void> {
    const headRevision =
      await this.shareTransactionalQueries.findHeadRevisionInBranchOrThrow(
        branchId,
      );

    const draftRevision =
      await this.shareTransactionalQueries.findDraftRevisionInBranchOrThrow(
        branchId,
      );

    const tableInHead =
      await this.shareTransactionalQueries.findTableInRevision(
        headRevision.id,
        tableId,
      );

    const tableInDraft =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        draftRevision.id,
        tableId,
      );

    await this.transaction.revision.update({
      where: { id: draftRevision.id },
      data: {
        tables: {
          disconnect: {
            versionId: tableInDraft.versionId,
          },
          ...(tableInHead && {
            connect: {
              versionId: tableInHead.versionId,
            },
          }),
        },
      },
    });
  }

  private async updateRevisionHasChanges(
    revisionId: string,
    parentRevisionId: string,
  ): Promise<void> {
    const hasChanges = await this.diffService.hasTableDiffs({
      fromRevisionId: parentRevisionId,
      toRevisionId: revisionId,
    });

    await this.transaction.revision.update({
      where: { id: revisionId },
      data: { hasChanges },
    });
  }
}
