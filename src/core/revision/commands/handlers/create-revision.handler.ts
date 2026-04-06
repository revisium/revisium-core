import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RevisionCommittedEvent } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { CreateRevisionCommand } from '../impl/create-revision.command';

@CommandHandler(CreateRevisionCommand)
export class CreateRevisionHandler implements ICommandHandler<CreateRevisionCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
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

    const movedEndpointIds = await this.moveEndpointsAfterCommit(
      previousDraftRevisionId,
      previousHeadRevisionId,
      newDraft.id,
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
    const allEndpointIds: string[] = [];

    const draftEndpoints = await this.prisma.endpoint.findMany({
      where: { revisionId: previousDraftRevisionId, isDeleted: false },
      select: { id: true },
    });
    for (const ep of draftEndpoints) {
      await this.prisma.endpoint.update({
        where: { id: ep.id },
        data: { revisionId: nextDraftRevisionId, createdAt: new Date() },
      });
      allEndpointIds.push(ep.id);
    }

    await this.prisma.endpoint.deleteMany({
      where: { revisionId: nextDraftRevisionId, isDeleted: true },
    });

    const headEndpoints = await this.prisma.endpoint.findMany({
      where: { revisionId: previousHeadRevisionId, isDeleted: false },
      select: { id: true },
    });
    for (const ep of headEndpoints) {
      await this.prisma.endpoint.update({
        where: { id: ep.id },
        data: { revisionId: previousDraftRevisionId, createdAt: new Date() },
      });
      allEndpointIds.push(ep.id);
    }

    await this.prisma.endpoint.deleteMany({
      where: { revisionId: previousDraftRevisionId, isDeleted: true },
    });

    return allEndpointIds;
  }
}
