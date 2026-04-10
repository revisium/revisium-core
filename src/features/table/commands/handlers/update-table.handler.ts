import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { TableSchemaUpdatedEvent } from 'src/infrastructure/cache';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { UpdateTableCommand } from '../impl/update-table.command';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler implements ICommandHandler<UpdateTableCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: UpdateTableCommand) {
    const result = await this.engine.updateTable(data);
    await this.eventBus.publishAll([
      new TableSchemaUpdatedEvent(data.revisionId, data.tableId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
