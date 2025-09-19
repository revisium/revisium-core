import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RowRenamedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(RowRenamedEvent)
export class RowRenamedEventHandler implements IEventHandler<RowRenamedEvent> {
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: RowRenamedEvent) {
    await this.rowCache.invalidateRow({
      revisionId: event.revisionId,
      tableId: event.tableId,
      rowId: event.oldRowId,
    });
    await this.rowCache.invalidateGetRows(event);
  }
}
