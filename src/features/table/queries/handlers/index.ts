import { GetCountRowsInTableHandler } from 'src/features/table/queries/handlers/get-count-rows-in-table.handler';
import { GetRowsByTableHandler } from 'src/features/table/queries/handlers/get-rows-by-table.handler';
import { GetTableByIdHandler } from 'src/features/table/queries/handlers/get-table-by-id.handler';
import { GetTableHandler } from 'src/features/table/queries/handlers/get-table.handler';
import { GetTablesHandler } from 'src/features/table/queries/handlers/get-tables.handler';
import { ResolveTableCountReferencesByHandler } from 'src/features/table/queries/handlers/resolve-table-count-references-by.handler';
import { ResolveTableCountReferencesToHandler } from 'src/features/table/queries/handlers/resolve-table-count-references-to.handler';
import { ResolveTableReferencesByHandler } from 'src/features/table/queries/handlers/resolve-table-references-by.handler';
import { ResolveTableReferencesToHandler } from 'src/features/table/queries/handlers/resolve-table-references-to.handler';
import { ResolveTableSchemaHandler } from 'src/features/table/queries/handlers/resolve-table-schema.handler';

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
