import { GetCountRowsInTableHandler } from 'src/features/table/queries/handlers/get-count-rows-in-table.handler';
import { GetRowsByTableHandler } from 'src/features/table/queries/handlers/get-rows-by-table.handler';
import { GetTableByIdHandler } from 'src/features/table/queries/handlers/get-table-by-id.handler';
import { GetTableHandler } from 'src/features/table/queries/handlers/get-table.handler';
import { GetTablesHandler } from 'src/features/table/queries/handlers/get-tables.handler';
import { ResolveTableCountForeignKeysByHandler } from 'src/features/table/queries/handlers/resolve-table-count-foreign-keys-by.handler';
import { ResolveTableCountForeignKeysToHandler } from 'src/features/table/queries/handlers/resolve-table-count-foreign-keys-to.handler';
import { ResolveTableForeignKeysByHandler } from 'src/features/table/queries/handlers/resolve-table-foreign-keys-by.handler';
import { ResolveTableForeignKeysToHandler } from 'src/features/table/queries/handlers/resolve-table-foreign-keys-to.handler';
import { ResolveTableSchemaHandler } from 'src/features/table/queries/handlers/resolve-table-schema.handler';

export const TABLE_QUERIES_HANDLERS = [
  GetTableHandler,
  GetTableByIdHandler,
  GetRowsByTableHandler,
  GetTablesHandler,
  GetCountRowsInTableHandler,
  ResolveTableSchemaHandler,
  ResolveTableForeignKeysByHandler,
  ResolveTableCountForeignKeysByHandler,
  ResolveTableForeignKeysToHandler,
  ResolveTableCountForeignKeysToHandler,
];
