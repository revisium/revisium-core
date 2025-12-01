import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  CheckOrganizationPermissionCommand,
  CheckOrganizationPermissionCommandData,
  CheckOrganizationPermissionCommandReturnType,
  CheckProjectPermissionCommand,
  CheckProjectPermissionCommandData,
  CheckProjectPermissionCommandReturnType,
  CheckSystemPermissionCommand,
  CheckSystemPermissionCommandData,
  CheckSystemPermissionCommandReturnType,
  ConfirmEmailCodeCommand,
  ConfirmEmailCodeCommandData,
  ConfirmEmailCodeCommandReturnType,
  CreateUserCommand,
  CreateUserCommandData,
  CreateUserCommandReturnType,
  LoginCommand,
  LoginCommandData,
  LoginCommandReturnType,
  LoginGithubCommand,
  LoginGithubCommandData,
  LoginGithubCommandReturnType,
  LoginGoogleCommand,
  LoginGoogleCommandData,
  LoginGoogleCommandReturnType,
  SignUpCommand,
  SignUpCommandData,
  SignUpCommandReturnType,
} from 'src/features/auth/commands/impl';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';

@Injectable()
export class AuthApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authCache: AuthCacheService,
  ) {}

  public checkSystemPermission(data: CheckSystemPermissionCommandData) {
    return this.authCache.systemPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckSystemPermissionCommand,
        CheckSystemPermissionCommandReturnType
      >(new CheckSystemPermissionCommand(data));
    });
  }

  public checkOrganizationPermission(
    data: CheckOrganizationPermissionCommandData,
  ) {
    return this.authCache.organizationPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckOrganizationPermissionCommand,
        CheckOrganizationPermissionCommandReturnType
      >(new CheckOrganizationPermissionCommand(data));
    });
  }

  public checkProjectPermission(data: CheckProjectPermissionCommandData) {
    return this.authCache.projectPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckProjectPermissionCommand,
        CheckProjectPermissionCommandReturnType
      >(new CheckProjectPermissionCommand(data));
    });
  }

  public login(data: LoginCommandData) {
    return this.commandBus.execute<LoginCommand, LoginCommandReturnType>(
      new LoginCommand(data),
    );
  }

  public loginGoogle(data: LoginGoogleCommandData) {
    return this.commandBus.execute<
      LoginGoogleCommand,
      LoginGoogleCommandReturnType
    >(new LoginGoogleCommand(data));
  }

  public loginGithub(data: LoginGithubCommandData) {
    return this.commandBus.execute<
      LoginGithubCommand,
      LoginGithubCommandReturnType
    >(new LoginGithubCommand(data));
  }

  public createUser(data: CreateUserCommandData) {
    return this.commandBus.execute<
      CreateUserCommand,
      CreateUserCommandReturnType
    >(new CreateUserCommand(data));
  }

  public signUp(data: SignUpCommandData) {
    return this.commandBus.execute<SignUpCommand, SignUpCommandReturnType>(
      new SignUpCommand(data),
    );
  }

  public confirmEmailCode(data: ConfirmEmailCodeCommandData) {
    return this.commandBus.execute<
      ConfirmEmailCodeCommand,
      ConfirmEmailCodeCommandReturnType
    >(new ConfirmEmailCodeCommand(data));
  }
}
