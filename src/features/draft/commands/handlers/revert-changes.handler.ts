import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { RevisionRevertedEvent } from 'src/infrastructure/cache';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RevertChangesCommand } from 'src/features/draft/commands/impl/revert-changes.command';
import { RevertChangesHandlerReturnType } from 'src/features/draft/commands/types/revert-changes.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

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
    protected readonly draftRevisionApi: DraftRevisionApiService,
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

    const { draftRevisionId } = await this.draftRevisionApi.revert({
      branchId,
    });

    return { branchId, draftRevisionId };
  }
}
