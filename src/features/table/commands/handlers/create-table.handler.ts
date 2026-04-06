import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RowCreatedEvent } from 'src/infrastructure/cache';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { CreateTableCommand } from '../impl/create-table.command';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler implements ICommandHandler<CreateTableCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: CreateTableCommand) {
    const result = await this.engine.createTable(data);
    await this.eventBus.publishAll([
      new RowCreatedEvent(
        data.revisionId,
        'revisium_schema_table',
        data.tableId,
      ),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
