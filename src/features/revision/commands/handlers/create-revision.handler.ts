import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RevisionCommittedEvent } from 'src/infrastructure/cache';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CreateRevisionCommand } from '../impl/create-revision.command';

@CommandHandler(CreateRevisionCommand)
export class CreateRevisionHandler implements ICommandHandler<CreateRevisionCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly endpointNotification: EndpointNotificationService,
  ) {}

  async execute({ data }: CreateRevisionCommand) {
    const result = await this.engine.createRevision(data);
    const { previousDraftRevisionId, previousHeadRevisionId } = result;

    const branch = await this.engine.getBranch({
      projectId: data.projectId,
      branchName: data.branchName,
    });
    const newDraft = await this.engine.getDraftRevision(branch.id);

    const movedEndpointIds = await this.transactionService.runSerializable(() =>
      this.moveEndpointsAfterCommit(
        previousDraftRevisionId,
        previousHeadRevisionId,
        newDraft.id,
      ),
    );

    await this.eventBus.publishAll([
      new RevisionCommittedEvent(
        previousHeadRevisionId,
        previousDraftRevisionId,
      ),
    ]);

    for (const endpointId of movedEndpointIds) {
      await this.endpointNotification.update(endpointId);
    }

    return result;
  }

  private async moveEndpointsAfterCommit(
    previousDraftRevisionId: string,
    previousHeadRevisionId: string,
    nextDraftRevisionId: string,
  ): Promise<string[]> {
    const transaction = this.transactionService.getTransaction();
    const allEndpointIds: string[] = [];

    const draftEndpoints = await transaction.endpoint.findMany({
      where: { revisionId: previousDraftRevisionId, isDeleted: false },
      select: { id: true },
    });
    for (const ep of draftEndpoints) {
      await transaction.endpoint.update({
        where: { id: ep.id },
        data: { revisionId: nextDraftRevisionId, createdAt: new Date() },
      });
      allEndpointIds.push(ep.id);
    }

    await transaction.endpoint.deleteMany({
      where: { revisionId: nextDraftRevisionId, isDeleted: true },
    });

    const headEndpoints = await transaction.endpoint.findMany({
      where: { revisionId: previousHeadRevisionId, isDeleted: false },
      select: { id: true },
    });
    for (const ep of headEndpoints) {
      await transaction.endpoint.update({
        where: { id: ep.id },
        data: { revisionId: previousDraftRevisionId, createdAt: new Date() },
      });
      allEndpointIds.push(ep.id);
    }

    await transaction.endpoint.deleteMany({
      where: { revisionId: previousDraftRevisionId, isDeleted: true },
    });

    return allEndpointIds;
  }
}
