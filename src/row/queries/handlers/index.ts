import { GetRowByIdHandler } from 'src/row/queries/handlers/get-row-by-id.handler';
import { GetRowHandler } from 'src/row/queries/handlers/get-row.handler';
import { GetRowsHandler } from 'src/row/queries/handlers/get-rows.handler';
import { ResolveRowCountReferencesByHandler } from 'src/row/queries/handlers/resolve-row-count-references-by.handler';
import { ResolveRowCountReferencesToHandler } from 'src/row/queries/handlers/resolve-row-count-references-to.handler';
import { ResolveRowReferencesByHandler } from 'src/row/queries/handlers/resolve-row-references-by.handler';
import { ResolveRowReferencesToHandler } from 'src/row/queries/handlers/resolve-row-references-to.handler';

export const ROW_QUERIES_HANDLERS = [
  GetRowHandler,
  GetRowByIdHandler,
  GetRowsHandler,
  ResolveRowCountReferencesToHandler,
  ResolveRowCountReferencesByHandler,
  ResolveRowReferencesByHandler,
  ResolveRowReferencesToHandler,
];
