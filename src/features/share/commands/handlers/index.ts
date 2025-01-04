import { NotifyEndpointsHandler } from 'src/features/share/commands/handlers/notify-endpoints.handler';
import { MoveEndpointsHandler } from 'src/features/share/commands/handlers/transactional/move-endpoints.handler';

export const SHARE_COMMANDS_HANDLERS = [
  MoveEndpointsHandler,
  NotifyEndpointsHandler,
];
