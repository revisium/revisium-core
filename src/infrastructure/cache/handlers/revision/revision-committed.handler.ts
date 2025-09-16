import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RevisionCommittedEvent } from 'src/infrastructure/cache/events';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';

@EventsHandler(RevisionCommittedEvent)
export class RevisionCommittedEventHandler
  implements IEventHandler<RevisionCommittedEvent>
{
  constructor(private readonly revisionCache: RevisionCacheService) {}

  async handle(event: RevisionCommittedEvent) {
    await this.revisionCache.invalidateRevisions([
      event.previousHeadRevisionId,
      event.previousDraftRevisionId,
    ]);
  }
}
