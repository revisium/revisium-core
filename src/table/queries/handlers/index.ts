import { GetCountRowsInTableHandler } from 'src/table/queries/handlers/get-count-rows-in-table.handler';
import { GetRowsByTableHandler } from 'src/table/queries/handlers/get-rows-by-table.handler';
import { GetTableByIdHandler } from 'src/table/queries/handlers/get-table-by-id.handler';
import { GetTableHandler } from 'src/table/queries/handlers/get-table.handler';
import { GetTablesHandler } from 'src/table/queries/handlers/get-tables.handler';
import { ResolveTableCountReferencesByHandler } from 'src/table/queries/handlers/resolve-table-count-references-by.handler';
import { ResolveTableCountReferencesToHandler } from 'src/table/queries/handlers/resolve-table-count-references-to.handler';
import { ResolveTableReferencesByHandler } from 'src/table/queries/handlers/resolve-table-references-by.handler';
import { ResolveTableReferencesToHandler } from 'src/table/queries/handlers/resolve-table-references-to.handler';
import { ResolveTableSchemaHandler } from 'src/table/queries/handlers/resolve-table-schema.handler';

export const TABLE_QUERIES_HANDLERS = [
  GetTableHandler,
  GetTableByIdHandler,
  GetRowsByTableHandler,
  GetTablesHandler,
  GetCountRowsInTableHandler,
  ResolveTableSchemaHandler,
  ResolveTableReferencesByHandler,
  ResolveTableCountReferencesByHandler,
  ResolveTableReferencesToHandler,
  ResolveTableCountReferencesToHandler,
];
