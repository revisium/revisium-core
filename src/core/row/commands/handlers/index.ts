import { CreateRowHandler } from './create-row.handler';
import { CreateRowsHandler } from './create-rows.handler';
import { UpdateRowHandler } from './update-row.handler';
import { UpdateRowsHandler } from './update-rows.handler';
import { PatchRowHandler } from './patch-row.handler';
import { PatchRowsHandler } from './patch-rows.handler';
import { RenameRowHandler } from './rename-row.handler';
import { RemoveRowHandler } from './remove-row.handler';
import { RemoveRowsHandler } from './remove-rows.handler';
import { UploadFileHandler } from './upload-file.handler';

export const ROW_COMMAND_HANDLERS = [
  CreateRowHandler,
  CreateRowsHandler,
  UpdateRowHandler,
  UpdateRowsHandler,
  PatchRowHandler,
  PatchRowsHandler,
  RenameRowHandler,
  RemoveRowHandler,
  RemoveRowsHandler,
  UploadFileHandler,
] as const;
