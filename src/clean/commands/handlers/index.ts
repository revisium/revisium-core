import { CleanRowsHandler } from 'src/clean/commands/handlers/clean-rows.handler';
import { CleanTablesHandler } from 'src/clean/commands/handlers/clean-tables.handler';

export const CLEAN_COMMANDS_HANDLERS = [CleanTablesHandler, CleanRowsHandler];
