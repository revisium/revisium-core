import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RevisionRevertedEvent } from 'src/infrastructure/cache/events';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';

@EventsHandler(RevisionRevertedEvent)
export class RevisionRevertedEventHandler
  implements IEventHandler<RevisionRevertedEvent>
{
  constructor(private readonly revisionCache: RevisionCacheService) {}

  async handle(event: RevisionRevertedEvent) {
    await this.revisionCache.invalidateRevisions([event.revisionId]);
  }
}
