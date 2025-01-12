import { ApiCreateRevisionHandler } from 'src/features/draft/commands/handlers/api-create-revision.handler';
import { ApiCreateRowHandler } from 'src/features/draft/commands/handlers/api-create-row.handler';
import { ApiCreateTableHandler } from 'src/features/draft/commands/handlers/api-create-table.handler';
import { ApiRemoveRowHandler } from 'src/features/draft/commands/handlers/api-remove-row.handler';
import { ApiRemoveTableHandler } from 'src/features/draft/commands/handlers/api-remove-table.handler';
import { ApiRevertChangesHandler } from 'src/features/draft/commands/handlers/api-revert-changes.handler';
import { ApiUpdateRowHandler } from 'src/features/draft/commands/handlers/api-update-row.handler';
import { ApiUpdateTableHandler } from 'src/features/draft/commands/handlers/api-update-table.handler';
import { CreateRevisionHandler } from 'src/features/draft/commands/handlers/create-revision.handler';
import { CreateRowHandler } from 'src/features/draft/commands/handlers/create-row.handler';
import { CreateSchemaHandler } from 'src/features/draft/commands/handlers/transactional/create-schema.handler';
import { CreateTableHandler } from 'src/features/draft/commands/handlers/create-table.handler';
import { RemoveRowHandler } from 'src/features/draft/commands/handlers/remove-row.handler';
import { RemoveTableHandler } from 'src/features/draft/commands/handlers/remove-table.handler';
import { RevertChangesHandler } from 'src/features/draft/commands/handlers/revert-changes.handler';
import { GetOrCreateDraftRowHandler } from 'src/features/draft/commands/handlers/transactional/get-or-create-draft-row.handler';
import { GetOrCreateDraftRowsHandler } from 'src/features/draft/commands/handlers/transactional/get-or-create-draft-rows.handler';
import { GetOrCreateDraftTableHandler } from 'src/features/draft/commands/handlers/transactional/get-or-create-draft-table.handler';
import { InternalCreateRowHandler } from 'src/features/draft/commands/handlers/transactional/internal-create-row.handler';
import { InternalUpdateRowHandler } from 'src/features/draft/commands/handlers/transactional/internal-update-row.handler';
import { ResolveDraftRevisionHandler } from 'src/features/draft/commands/handlers/transactional/resolve-draft-revision.handler';
import { UpdateSchemaHandler } from 'src/features/draft/commands/handlers/transactional/update-schema.handler';
import { ValidateDataHandler } from 'src/features/draft/commands/handlers/transactional/validate-data.handler';
import { ValidateNotSystemTableHandler } from 'src/features/draft/commands/handlers/transactional/validate-not-system-table.handler';
import { ValidateSchemaHandler } from 'src/features/draft/commands/handlers/transactional/validate-schema.handler';
import { UpdateRowHandler } from 'src/features/draft/commands/handlers/update-row.handler';
import { UpdateRowsHandler } from 'src/features/draft/commands/handlers/transactional/update-rows.handler';
import { UpdateTableHandler } from 'src/features/draft/commands/handlers/update-table.handler';

export const TABLE_COMMANDS_HANDLERS = [
  CreateTableHandler,
  ApiCreateTableHandler,
  RemoveTableHandler,
  ApiRemoveTableHandler,
  CreateRowHandler,
  InternalCreateRowHandler,
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
  CreateSchemaHandler,
  InternalUpdateRowHandler,
  UpdateSchemaHandler,
];
