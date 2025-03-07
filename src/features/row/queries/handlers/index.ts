import { GetRowByIdHandler } from 'src/features/row/queries/handlers/get-row-by-id.handler';
import { GetRowHandler } from 'src/features/row/queries/handlers/get-row.handler';
import { GetRowsHandler } from 'src/features/row/queries/handlers/get-rows.handler';
import { ResolveRowCountForeignKeysByHandler } from 'src/features/row/queries/handlers/resolve-row-count-foreign-keys-by.handler';
import { ResolveRowCountForeignKeysToHandler } from 'src/features/row/queries/handlers/resolve-row-count-foreign-keys-to.handler';
import { ResolveRowForeignKeysByHandler } from 'src/features/row/queries/handlers/resolve-row-foreign-keys-by.handler';
import { ResolveRowForeignKeysToHandler } from 'src/features/row/queries/handlers/resolve-row-foreign-keys-to.handler';

export const ROW_QUERIES_HANDLERS = [
  GetRowHandler,
  GetRowByIdHandler,
  GetRowsHandler,
  ResolveRowCountForeignKeysToHandler,
  ResolveRowCountForeignKeysByHandler,
  ResolveRowForeignKeysByHandler,
  ResolveRowForeignKeysToHandler,
];
