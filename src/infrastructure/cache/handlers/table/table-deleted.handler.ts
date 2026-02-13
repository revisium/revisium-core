import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableDeletedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(TableDeletedEvent)
export class TableDeletedEventHandler implements IEventHandler<TableDeletedEvent> {
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: TableDeletedEvent) {
    await this.rowCache.invalidateTableRelatives(event);
  }
}
