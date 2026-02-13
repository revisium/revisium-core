import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RowsDeletedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(RowsDeletedEvent)
export class RowsDeletedEventHandler implements IEventHandler<RowsDeletedEvent> {
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: RowsDeletedEvent) {
    await this.rowCache.invalidateRows(event);
    await this.rowCache.invalidateGetRows(event);
  }
}
