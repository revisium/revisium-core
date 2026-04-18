import { ResetPasswordHandler } from 'src/features/user/commands/handlers/reset-password.handler';
import { SetUsernameHandler } from 'src/features/user/commands/handlers/set-username.handler';
import { UpdatePasswordHandler } from 'src/features/user/commands/handlers/update-password.handler';

export const USER_COMMANDS = [
  UpdatePasswordHandler,
  SetUsernameHandler,
  ResetPasswordHandler,
];
