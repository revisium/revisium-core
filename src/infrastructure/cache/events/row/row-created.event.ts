import { CacheEvent } from '../base.event';

export class RowCreatedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly tableId: string,
    public readonly rowId: string,
  ) {
    super();
  }
}
