import { CacheEvent } from '../base.event';

export class RevisionRevertedEvent extends CacheEvent {
  constructor(public readonly revisionId: string) {
    super();
  }
}
