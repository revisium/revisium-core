import { NotifyEndpointsHandler } from 'src/share/commands/handlers/notify-endpoints.handler';
import { MoveEndpointsHandler } from './transactional/move-endpoints.handler';

export const SHARE_COMMANDS_HANDLERS = [
  MoveEndpointsHandler,
  NotifyEndpointsHandler,
];
