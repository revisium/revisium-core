import { UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  ConfirmEmailCodeCommand,
  ConfirmEmailCodeCommandReturnType,
  CreateUserCommand,
  CreateUserCommandReturnType,
  LoginCommand,
  LoginCommandReturnType,
  LoginGithubCommand,
  LoginGithubCommandReturnType,
  LoginGoogleCommand,
  LoginGoogleCommandReturnType,
  SignUpCommand,
  SignUpCommandReturnType,
} from 'src/auth/commands/impl';
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { GqlJwtAuthGuard } from 'src/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { GQLSystemGuard } from 'src/auth/guards/system.guard';
import {
  ConfirmEmailCodeInput,
  CreateUserInput,
  LoginGithubInput,
  LoginGoogleInput,
  LoginInput,
  SignUpInput,
} from 'src/graphql-api/auth/inputs';
import { LoginModel } from 'src/graphql-api/auth/model';

@Resolver()
export class AuthResolver {
  constructor(private readonly commandBus: CommandBus) {}

  @Mutation(() => LoginModel)
  public login(@Args('data') data: LoginInput): Promise<LoginModel> {
    return this.commandBus.execute<LoginCommand, LoginCommandReturnType>(
      new LoginCommand({ ...data }),
    );
  }

  @Mutation(() => LoginModel)
  public async loginGoogle(
    @Args('data') data: LoginGoogleInput,
  ): Promise<LoginModel> {
    return this.commandBus.execute<
      LoginGoogleCommand,
      LoginGoogleCommandReturnType
    >(new LoginGoogleCommand({ ...data }));
  }

  @Mutation(() => LoginModel)
  public async loginGithub(
    @Args('data') data: LoginGithubInput,
  ): Promise<LoginModel> {
    return this.commandBus.execute<
      LoginGithubCommand,
      LoginGithubCommandReturnType
    >(new LoginGithubCommand({ ...data }));
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
    await this.commandBus.execute<
      CreateUserCommand,
      CreateUserCommandReturnType
    >(new CreateUserCommand({ ...data, isEmailConfirmed: true }));

    return true;
  }

  @Mutation(() => Boolean)
  public async signUp(@Args('data') data: SignUpInput): Promise<boolean> {
    await this.commandBus.execute<SignUpCommand, SignUpCommandReturnType>(
      new SignUpCommand({ ...data }),
    );

    return true;
  }

  @Mutation(() => LoginModel)
  public async confirmEmailCode(
    @Args('data') data: ConfirmEmailCodeInput,
  ): Promise<LoginModel> {
    return this.commandBus.execute<
      ConfirmEmailCodeCommand,
      ConfirmEmailCodeCommandReturnType
    >(new ConfirmEmailCodeCommand({ ...data }));
  }
}
