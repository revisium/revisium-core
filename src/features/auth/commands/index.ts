import { CheckOrganizationPermissionHandler } from 'src/features/auth/commands/handlers/check-organization-permission.handler';
import { CheckProjectPermissionHandler } from 'src/features/auth/commands/handlers/check-project-permission.handler';
import { CheckSystemPermissionHandler } from 'src/features/auth/commands/handlers/check-system-permission.handler';
import { ConfirmEmailCodeHandler } from 'src/features/auth/commands/handlers/confirm-email-code.handler';
import { CreateUserHandler } from 'src/features/auth/commands/handlers/create-user.handler';
import { LoginGithubHandler } from 'src/features/auth/commands/handlers/login-github.handler';
import { LoginGoogleHandler } from 'src/features/auth/commands/handlers/login-google.handler';
import { LoginHandler } from 'src/features/auth/commands/handlers/login.handler';
import { SignUpHandler } from 'src/features/auth/commands/handlers/sign-up.handler';

export const AUTH_COMMANDS = [
  LoginHandler,
  CreateUserHandler,
  CheckSystemPermissionHandler,
  CheckProjectPermissionHandler,
  CheckOrganizationPermissionHandler,
  SignUpHandler,
  ConfirmEmailCodeHandler,
  LoginGoogleHandler,
  LoginGithubHandler,
];
