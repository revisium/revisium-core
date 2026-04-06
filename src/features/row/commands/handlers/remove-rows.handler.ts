import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RowsDeletedEvent } from 'src/infrastructure/cache';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { RemoveRowsCommand } from '../impl/remove-rows.command';

@CommandHandler(RemoveRowsCommand)
export class RemoveRowsHandler implements ICommandHandler<RemoveRowsCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: RemoveRowsCommand) {
    const result = await this.engine.removeRows(data);
    await this.eventBus.publishAll([
      new RowsDeletedEvent(data.revisionId, data.tableId, data.rowIds),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
