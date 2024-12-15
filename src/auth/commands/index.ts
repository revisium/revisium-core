import {
  CheckOrganizationPermissionHandler,
  CheckProjectPermissionHandler,
  CheckSystemPermissionHandler,
  ConfirmEmailCodeHandler,
  CreateUserHandler,
  LoginGithubHandler,
  LoginGoogleHandler,
  LoginHandler,
  SignUpHandler,
} from 'src/auth/commands/handlers';

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
