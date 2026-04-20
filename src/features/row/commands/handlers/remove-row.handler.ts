import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RowsDeletedEvent } from 'src/infrastructure/cache';
import { RemoveRowCommand } from '../impl/remove-row.command';

@CommandHandler(RemoveRowCommand)
export class RemoveRowHandler implements ICommandHandler<RemoveRowCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ data }: RemoveRowCommand) {
    const result = await this.engine.removeRow(data);
    await this.eventBus.publishAll([
      new RowsDeletedEvent(data.revisionId, data.tableId, [data.rowId]),
    ]);
    return result;
  }
}
