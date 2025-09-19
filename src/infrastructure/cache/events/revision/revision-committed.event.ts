import { CacheEvent } from '../base.event';

export class RevisionCommittedEvent extends CacheEvent {
  constructor(
    public readonly previousHeadRevisionId: string,
    public readonly previousDraftRevisionId: string,
  ) {
    super();
  }
}
