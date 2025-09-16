import { CacheEvent } from '../base.event';

export class TableRenamedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly oldTableId: string,
    public readonly newTableId: string,
  ) {
    super();
  }
}
