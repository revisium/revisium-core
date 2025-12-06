import { RowCreatedEventHandler } from './row/row-created.handler';
import { RowUpdatedEventHandler } from './row/row-updated.handler';
import { RowDeletedEventHandler } from './row/row-deleted.handler';
import { RowsDeletedEventHandler } from './row/rows-deleted.handler';
import { RowRenamedEventHandler } from './row/row-renamed.handler';
import { TableSchemaUpdatedEventHandler } from './table/table-schema-updated.handler';
import { TableDeletedEventHandler } from './table/table-deleted.handler';
import { TableRenamedEventHandler } from './table/table-renamed.handler';
import { RevisionCommittedEventHandler } from './revision/revision-committed.handler';
import { RevisionRevertedEventHandler } from './revision/revision-reverted.handler';

export const CACHE_EVENT_HANDLERS = [
  RowCreatedEventHandler,
  RowUpdatedEventHandler,
  RowDeletedEventHandler,
  RowsDeletedEventHandler,
  RowRenamedEventHandler,

  TableSchemaUpdatedEventHandler,
  TableDeletedEventHandler,
  TableRenamedEventHandler,

  RevisionCommittedEventHandler,
  RevisionRevertedEventHandler,
] as const;
