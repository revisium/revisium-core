import { CommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { RevertChangesCommand } from 'src/draft/commands/impl/revert-changes.command';
import { RevertChangesHandlerReturnType } from 'src/draft/commands/types/revert-changes.handler.types';
import { DraftContextService } from 'src/draft/draft-context.service';
import { DraftHandler } from 'src/draft/draft.handler';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';

@CommandHandler(RevertChangesCommand)
export class RevertChangesHandler extends DraftHandler<
  RevertChangesCommand,
  RevertChangesHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: RevertChangesCommand): Promise<RevertChangesHandlerReturnType> {
    const { organizationId, projectName, branchName } = data;

    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        organizationId,
        projectName,
      );

    const { id: branchId } =
      await this.shareTransactionalQueries.findBranchInProjectOrThrow(
        projectId,
        branchName,
      );
    const headRevision =
      await this.shareTransactionalQueries.findHeadRevisionInBranchOrThrow(
        branchId,
      );
    const draftRevision =
      await this.shareTransactionalQueries.findDraftRevisionInBranchOrThrow(
        branchId,
      );

    const { hasChanges, id: draftChangelogId } = await this.getChangelog(
      draftRevision.id,
    );

    if (!hasChanges) {
      throw new Error('There are no changes');
    }

    const headRevisionTables = await this.getHeadRevisionTables(
      headRevision.id,
    );

    await this.resetDraftRevision(draftRevision.id, headRevisionTables);
    await this.updateChangeLog(draftChangelogId);

    return { branchId, draftRevisionId: draftRevision.id };
  }

  private getChangelog(revisionId: string) {
    return this.transaction.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .changelog({ select: { id: true, hasChanges: true } });
  }

  private getHeadRevisionTables(revisionId: string) {
    return this.transaction.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .tables({ select: { versionId: true } });
  }

  private resetDraftRevision(
    revisionId: string,
    tables: { versionId: string }[],
  ) {
    return this.transaction.revision.update({
      where: {
        id: revisionId,
      },
      data: {
        tables: {
          set: tables,
        },
      },
    });
  }

  private async updateChangeLog(changelogId: string) {
    return this.transaction.changelog.update({
      where: { id: changelogId },
      data: {
        tableInserts: {},
        rowInserts: {},
        tableUpdates: {},
        rowUpdates: {},
        tableDeletes: {},
        rowDeletes: {},
        tableInsertsCount: 0,
        rowInsertsCount: 0,
        tableUpdatesCount: 0,
        rowUpdatesCount: 0,
        tableDeletesCount: 0,
        rowDeletesCount: 0,
        hasChanges: false,
      },
      select: { id: true },
    });
  }
}
