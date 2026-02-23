import { CleanOAuthExpiredAccessTokensHandler } from 'src/infrastructure/clean/commands/handlers/clean-oauth-expired-access-tokens.handler';
import { CleanOAuthExpiredCodesHandler } from 'src/infrastructure/clean/commands/handlers/clean-oauth-expired-codes.handler';
import { CleanOAuthExpiredRefreshTokensHandler } from 'src/infrastructure/clean/commands/handlers/clean-oauth-expired-refresh-tokens.handler';
import { CleanRowsHandler } from 'src/infrastructure/clean/commands/handlers/clean-rows.handler';
import { CleanTablesHandler } from 'src/infrastructure/clean/commands/handlers/clean-tables.handler';

export const CLEAN_COMMANDS_HANDLERS = [
  CleanTablesHandler,
  CleanRowsHandler,
  CleanOAuthExpiredCodesHandler,
  CleanOAuthExpiredAccessTokensHandler,
  CleanOAuthExpiredRefreshTokensHandler,
];
