import { CacheEvent } from '../base.event';

export class RowDeletedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly tableId: string,
    public readonly rowId: string,
  ) {
    super();
  }
}
