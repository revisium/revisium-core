import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { TableDeletedEvent } from 'src/infrastructure/cache';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { RemoveTableCommand } from '../impl/remove-table.command';

@CommandHandler(RemoveTableCommand)
export class RemoveTableHandler implements ICommandHandler<RemoveTableCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: RemoveTableCommand) {
    const result = await this.engine.removeTable(data);
    await this.eventBus.publishAll([
      new TableDeletedEvent(data.revisionId, data.tableId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
