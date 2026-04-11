import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Request as ExpressRequest, Response } from 'express';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLSystemGuard } from 'src/features/auth/guards/system.guard';
import { CookieService } from 'src/features/auth/services/cookie.service';
import {
  ConfirmEmailCodeInput,
  CreateUserInput,
  LoginGithubInput,
  LoginGoogleInput,
  LoginInput,
  SignUpInput,
} from 'src/api/graphql-api/auth/inputs';
import { LoginModel } from 'src/api/graphql-api/auth/model';

type RequestWithCookies = ExpressRequest & {
  cookies?: Record<string, string>;
};

type GqlContext = {
  req: RequestWithCookies;
  res: Response;
};

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authApiService: AuthApiService,
    private readonly cookieService: CookieService,
  ) {}

  @Mutation(() => LoginModel)
  public async login(
    @Args('data') data: LoginInput,
    @Context() ctx: GqlContext,
  ): Promise<LoginModel> {
    const result = await this.authApiService.login({
      ...data,
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });
    this.maybeSetCookies(ctx, result);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @Mutation(() => LoginModel)
  public async loginGoogle(
    @Args('data') data: LoginGoogleInput,
    @Context() ctx: GqlContext,
  ): Promise<LoginModel> {
    const result = await this.authApiService.loginGoogle({
      ...data,
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });
    this.maybeSetCookies(ctx, result);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @Mutation(() => LoginModel)
  public async loginGithub(
    @Args('data') data: LoginGithubInput,
    @Context() ctx: GqlContext,
  ): Promise<LoginModel> {
    const result = await this.authApiService.loginGithub({
      ...data,
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });
    this.maybeSetCookies(ctx, result);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
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
      roleId: data.roleId,
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
    @Context() ctx: GqlContext,
  ): Promise<LoginModel> {
    const result = await this.authApiService.confirmEmailCode({
      ...data,
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });
    this.maybeSetCookies(ctx, result);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  private maybeSetCookies(
    ctx: GqlContext,
    result: { accessToken: string; refreshToken: string | null },
  ): void {
    if (ctx.res && result.refreshToken) {
      this.cookieService.setAuthCookies(
        ctx.res,
        result.accessToken,
        result.refreshToken,
      );
    }
  }
}
