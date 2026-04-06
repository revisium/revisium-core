import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RevisionRevertedEvent } from 'src/infrastructure/cache';
import { RevertChangesCommand } from '../impl/revert-changes.command';

@CommandHandler(RevertChangesCommand)
export class RevertChangesHandler implements ICommandHandler<RevertChangesCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ data }: RevertChangesCommand) {
    const result = await this.engine.revertChanges(data);
    const branchId = (result as { id: string }).id;
    const draftRevision = await this.engine.getDraftRevision(branchId);
    await this.eventBus.publishAll([
      new RevisionRevertedEvent((draftRevision as { id: string }).id),
    ]);
    return result;
  }
}
