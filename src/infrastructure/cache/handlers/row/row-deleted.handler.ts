import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RowDeletedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(RowDeletedEvent)
export class RowDeletedEventHandler implements IEventHandler<RowDeletedEvent> {
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: RowDeletedEvent) {
    await this.rowCache.invalidateRow(event);
    await this.rowCache.invalidateGetRows(event);
  }
}
