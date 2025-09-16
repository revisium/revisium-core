import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RowCreatedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(RowCreatedEvent)
export class RowCreatedEventHandler implements IEventHandler<RowCreatedEvent> {
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: RowCreatedEvent) {
    await this.rowCache.invalidateGetRows(event);
  }
}
