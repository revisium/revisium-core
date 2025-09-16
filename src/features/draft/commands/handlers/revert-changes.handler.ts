import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { RevisionRevertedEvent } from 'src/infrastructure/cache';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RevertChangesCommand } from 'src/features/draft/commands/impl/revert-changes.command';
import { RevertChangesHandlerReturnType } from 'src/features/draft/commands/types/revert-changes.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(RevertChangesCommand)
export class RevertChangesHandler extends DraftHandler<
  RevertChangesCommand,
  RevertChangesHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly eventBus: EventBus,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions(
    _: RevertChangesCommand,
    result: RevertChangesHandlerReturnType,
  ) {
    await this.eventBus.publishAll([
      new RevisionRevertedEvent(result.draftRevisionId),
    ]);
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

    const { hasChanges } = await this.getRevision(draftRevision.id);

    if (!hasChanges) {
      throw new BadRequestException('There are no changes');
    }

    const headRevisionTables = await this.getHeadRevisionTables(
      headRevision.id,
    );

    await this.resetDraftRevision(draftRevision.id, headRevisionTables);

    return { branchId, draftRevisionId: draftRevision.id };
  }

  private getRevision(revisionId: string) {
    return this.transaction.revision.findUniqueOrThrow({
      where: { id: revisionId },
    });
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
        hasChanges: false,
        tables: {
          set: tables,
        },
      },
    });
  }
}
