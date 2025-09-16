import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableSchemaUpdatedEvent } from 'src/infrastructure/cache/events';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(TableSchemaUpdatedEvent)
export class TableSchemaUpdatedEventHandler
  implements IEventHandler<TableSchemaUpdatedEvent>
{
  constructor(private readonly rowCache: RowCacheService) {}

  async handle(event: TableSchemaUpdatedEvent) {
    await this.rowCache.invalidateTableRelatives(event);
  }
}
