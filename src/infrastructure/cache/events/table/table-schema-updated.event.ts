import { CacheEvent } from '../base.event';

export class TableSchemaUpdatedEvent extends CacheEvent {
  constructor(
    public readonly revisionId: string,
    public readonly tableId: string,
  ) {
    super();
  }
}
