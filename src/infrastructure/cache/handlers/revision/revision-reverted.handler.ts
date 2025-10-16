import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RevisionRevertedEvent } from 'src/infrastructure/cache/events';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@EventsHandler(RevisionRevertedEvent)
export class RevisionRevertedEventHandler
  implements IEventHandler<RevisionRevertedEvent>
{
  constructor(
    private readonly revisionCache: RevisionCacheService,
    private readonly rowCache: RowCacheService,
  ) {}

  async handle(event: RevisionRevertedEvent) {
    await Promise.all([
      this.revisionCache.invalidateRevisions([event.revisionId]),
      this.rowCache.invalidateRevisionRelatives(event.revisionId),
    ]);
  }
}
