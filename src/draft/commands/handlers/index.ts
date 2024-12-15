import { ApiCreateRevisionHandler } from 'src/draft/commands/handlers/api-create-revision.handler';
import { ApiCreateRowHandler } from 'src/draft/commands/handlers/api-create-row.handler';
import { ApiCreateTableHandler } from 'src/draft/commands/handlers/api-create-table.handler';
import { ApiRemoveRowHandler } from 'src/draft/commands/handlers/api-remove-row.handler';
import { ApiRemoveTableHandler } from 'src/draft/commands/handlers/api-remove-table.handler';
import { ApiRevertChangesHandler } from 'src/draft/commands/handlers/api-revert-changes.handler';
import { ApiUpdateRowHandler } from 'src/draft/commands/handlers/api-update-row.handler';
import { ApiUpdateTableHandler } from 'src/draft/commands/handlers/api-update-table.handler';
import { CreateRevisionHandler } from 'src/draft/commands/handlers/create-revision.handler';
import { CreateRowHandler } from 'src/draft/commands/handlers/create-row.handler';
import { CreateTableHandler } from 'src/draft/commands/handlers/create-table.handler';
import { RemoveRowHandler } from 'src/draft/commands/handlers/remove-row.handler';
import { RemoveTableHandler } from 'src/draft/commands/handlers/remove-table.handler';
import { RevertChangesHandler } from 'src/draft/commands/handlers/revert-changes.handler';
import { GetOrCreateDraftRowHandler } from 'src/draft/commands/handlers/transactional/get-or-create-draft-row.handler';
import { GetOrCreateDraftRowsHandler } from 'src/draft/commands/handlers/transactional/get-or-create-draft-rows.handler';
import { GetOrCreateDraftTableHandler } from 'src/draft/commands/handlers/transactional/get-or-create-draft-table.handler';
import { ResolveDraftRevisionHandler } from 'src/draft/commands/handlers/transactional/resolve-draft-revision.handler';
import { ValidateDataHandler } from 'src/draft/commands/handlers/transactional/validate-data.handler';
import { ValidateNotSystemTableHandler } from 'src/draft/commands/handlers/transactional/validate-not-system-table.handler';
import { ValidateSchemaHandler } from 'src/draft/commands/handlers/transactional/validate-schema.handler';
import { UpdateRowHandler } from 'src/draft/commands/handlers/update-row.handler';
import { UpdateRowsHandler } from 'src/draft/commands/handlers/update-rows.handler';
import { UpdateTableHandler } from 'src/draft/commands/handlers/update-table.handler';

export const TABLE_COMMANDS_HANDLERS = [
  CreateTableHandler,
  ApiCreateTableHandler,
  RemoveTableHandler,
  ApiRemoveTableHandler,
  CreateRowHandler,
  ApiCreateRowHandler,
  UpdateRowHandler,
  ApiUpdateRowHandler,
  UpdateRowsHandler,
  RemoveRowHandler,
  ApiRemoveRowHandler,
  GetOrCreateDraftTableHandler,
  GetOrCreateDraftRowHandler,
  GetOrCreateDraftRowsHandler,
  ResolveDraftRevisionHandler,
  ValidateNotSystemTableHandler,
  ValidateDataHandler,
  ValidateSchemaHandler,
  UpdateTableHandler,
  ApiUpdateTableHandler,
  CreateRevisionHandler,
  ApiCreateRevisionHandler,
  RevertChangesHandler,
  ApiRevertChangesHandler,
];
