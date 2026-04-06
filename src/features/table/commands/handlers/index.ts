import { CreateTableHandler } from './create-table.handler';
import { UpdateTableHandler } from './update-table.handler';
import { RenameTableHandler } from './rename-table.handler';
import { RemoveTableHandler } from './remove-table.handler';

export const TABLE_COMMAND_HANDLERS = [
  CreateTableHandler,
  UpdateTableHandler,
  RenameTableHandler,
  RemoveTableHandler,
] as const;
