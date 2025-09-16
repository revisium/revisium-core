import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RowUpdatedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(RowUpdatedEvent)
export class RowUpdatedEventHandler implements IEventHandler<RowUpdatedEvent> {
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: RowUpdatedEvent) {
    await this.rowCache.invalidateRow(event);
    await this.rowCache.invalidateGetRows(event);
  }
}
