import { CacheEvent } from '../base.event';

export class TableDeletedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly tableId: string,
  ) {
    super();
  }
}
