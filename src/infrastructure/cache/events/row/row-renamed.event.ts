import { CacheEvent } from '../base.event';

export class RowRenamedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly tableId: string,
    public readonly oldRowId: string,
    public readonly newRowId: string,
  ) {
    super();
  }
}
