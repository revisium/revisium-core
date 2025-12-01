import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import {
  PermissionAction,
  PermissionSubject,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLSystemGuard } from 'src/features/auth/guards/system.guard';
import {
  ConfirmEmailCodeInput,
  CreateUserInput,
  LoginGithubInput,
  LoginGoogleInput,
  LoginInput,
  SignUpInput,
} from 'src/api/graphql-api/auth/inputs';
import { LoginModel } from 'src/api/graphql-api/auth/model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authApiService: AuthApiService) {}

  @Mutation(() => LoginModel)
  public login(@Args('data') data: LoginInput): Promise<LoginModel> {
    return this.authApiService.login(data);
  }

  @Mutation(() => LoginModel)
  public async loginGoogle(
    @Args('data') data: LoginGoogleInput,
  ): Promise<LoginModel> {
    return this.authApiService.loginGoogle(data);
  }

  @Mutation(() => LoginModel)
  public async loginGithub(
    @Args('data') data: LoginGithubInput,
  ): Promise<LoginModel> {
    return this.authApiService.loginGithub(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLSystemGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  public async createUser(
    @Args('data') data: CreateUserInput,
  ): Promise<boolean> {
    await this.authApiService.createUser({
      ...data,
      roleId: data.roleId as UserSystemRoles,
      isEmailConfirmed: true,
    });

    return true;
  }

  @Mutation(() => Boolean)
  public async signUp(@Args('data') data: SignUpInput): Promise<boolean> {
    await this.authApiService.signUp(data);

    return true;
  }

  @Mutation(() => LoginModel)
  public async confirmEmailCode(
    @Args('data') data: ConfirmEmailCodeInput,
  ): Promise<LoginModel> {
    return this.authApiService.confirmEmailCode(data);
  }
}
