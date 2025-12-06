import { CacheEvent } from '../base.event';

export class RowsDeletedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly tableId: string,
    public readonly rowIds: string[],
  ) {
    super();
  }
}
