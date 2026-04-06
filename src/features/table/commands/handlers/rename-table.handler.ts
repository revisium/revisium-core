import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { TableRenamedEvent } from 'src/infrastructure/cache';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { RenameTableCommand } from '../impl/rename-table.command';

@CommandHandler(RenameTableCommand)
export class RenameTableHandler implements ICommandHandler<RenameTableCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: RenameTableCommand) {
    const result = await this.engine.renameTable(data);
    await this.eventBus.publishAll([
      new TableRenamedEvent(data.revisionId, data.tableId, data.nextTableId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
