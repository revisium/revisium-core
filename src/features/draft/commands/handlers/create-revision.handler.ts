import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { RevisionCommittedEvent } from 'src/infrastructure/cache';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CreateRevisionHandlerReturnType } from 'src/features/draft/commands/types/create-revision.handler.types';
import { CreateRevisionCommand } from 'src/features/draft/commands/impl/create-revision.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(CreateRevisionCommand)
export class CreateRevisionHandler extends DraftHandler<
  CreateRevisionCommand,
  CreateRevisionHandlerReturnType
> {
  constructor(
    protected readonly draftContext: DraftContextService,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly shareTransactionalCommands: ShareTransactionalCommands,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly eventBus: EventBus,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions(
    _: CreateRevisionCommand,
    result: CreateRevisionHandlerReturnType,
  ) {
    await this.eventBus.publishAll([
      new RevisionCommittedEvent(
        result.previousHeadRevisionId,
        result.previousDraftRevisionId,
      ),
    ]);
  }

  protected async handler({
    data,
  }: CreateRevisionCommand): Promise<CreateRevisionHandlerReturnType> {
    const { organizationId, projectName, branchName, comment } = data;

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

    const {
      previousHeadRevisionId,
      previousDraftRevisionId,
      nextDraftRevisionId,
    } = await this.draftRevisionApi.commit({ branchId, comment });

    const draftEndpoints = await this.shareTransactionalCommands.moveEndpoints({
      fromRevisionId: previousDraftRevisionId,
      toRevisionId: nextDraftRevisionId,
    });
    const headEndpoints = await this.shareTransactionalCommands.moveEndpoints({
      fromRevisionId: previousHeadRevisionId,
      toRevisionId: previousDraftRevisionId,
    });

    return {
      previousHeadRevisionId,
      previousDraftRevisionId,
      nextDraftRevisionId,
      draftEndpoints,
      headEndpoints,
    };
  }
}
