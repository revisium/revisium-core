import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableRenamedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(TableRenamedEvent)
export class TableRenamedEventHandler
  implements IEventHandler<TableRenamedEvent>
{
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: TableRenamedEvent) {
    await this.rowCache.invalidateTableRelatives({
      revisionId: event.revisionId,
      tableId: event.oldTableId,
    });
  }
}
