import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest, Response } from 'express';
import { ApiCommonErrors } from 'src/api/rest-api/share/decorators';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPSystemGuard } from 'src/features/auth/guards/system.guard';
import {
  CookieService,
  REFRESH_COOKIE_NAME,
} from 'src/features/auth/services/cookie.service';
import { RefreshTokenService } from 'src/features/auth/services/refresh-token.service';
import { IAuthUser } from 'src/features/auth/types';
import { UserApiService } from 'src/features/user/user-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { CreateUserDto, LoginDto } from 'src/api/rest-api/auth/dto';
import { UpdatePasswordDto } from 'src/api/rest-api/auth/dto/update-password.dto';
import { LoginResponse, RefreshResponse } from 'src/api/rest-api/auth/model';
import { SuccessModelDto } from 'src/api/rest-api/share/model/success.model';

type RequestWithCookies = ExpressRequest & {
  cookies?: Record<string, string>;
};

const SET_COOKIE_DESCRIPTION =
  'Three Set-Cookie headers are returned: ' +
  '`rev_at` (httpOnly JWT access token, Path=/, 30 min), ' +
  '`rev_rt` (httpOnly opaque refresh token, Path=/api/auth/, 7 d), ' +
  '`rev_session` (non-httpOnly presence flag "1", Path=/, 7 d). ' +
  'See docs/jwt-refresh.md for the full cookie model.';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authApiService: AuthApiService,
    private readonly userApiService: UserApiService,
    private readonly cookieService: CookieService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('login')
  @ApiOperation({
    operationId: 'login',
    summary: 'Authenticate and get access token',
    description:
      'Sets httpOnly auth cookies on success. The JSON body also carries ' +
      '`accessToken` + `expiresIn` for CLI / PAT consumers that use Bearer ' +
      'header auth and cannot manage cookies.',
  })
  @ApiOkResponse({
    type: LoginResponse,
    headers: {
      'Set-Cookie': {
        description: SET_COOKIE_DESCRIPTION,
        schema: { type: 'string' },
      },
    },
  })
  @ApiCommonErrors()
  async login(
    @Body() data: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.authApiService.login({
      ...data,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (result.refreshToken) {
      this.cookieService.setAuthCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'refresh',
    summary: 'Refresh access token using refresh cookie',
    description:
      'Reads the httpOnly `rev_rt` cookie, rotates it, and returns new ' +
      'Set-Cookie headers for all three auth cookies. No request body. ' +
      'No bearer / api-key auth — this endpoint is cookie-driven.',
  })
  @ApiHeader({
    name: 'Cookie',
    required: true,
    description: 'Must include `rev_rt=<opaque token>`',
    schema: { type: 'string' },
  })
  @ApiOkResponse({
    type: RefreshResponse,
    headers: {
      'Set-Cookie': {
        description: SET_COOKIE_DESCRIPTION,
        schema: { type: 'string' },
      },
    },
  })
  @ApiCommonErrors()
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      this.cookieService.clearAuthCookies(res);
      throw new UnauthorizedException('No refresh token');
    }

    // Only `rotateToken` failures (invalid / expired / reuse-detected)
    // should kill the client-side session. If the rotation succeeds but
    // `issueAccessTokenForUserId` subsequently fails on a transient DB
    // error, the new refresh token is still valid and the client can
    // simply retry — do NOT clear cookies in that window.
    let rotated: { userId: string; newToken: string };
    try {
      rotated = await this.refreshTokenService.rotateToken(refreshToken, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      this.cookieService.clearAuthCookies(res);
      throw error;
    }

    const access = await this.authApiService.issueAccessTokenForUserId(
      rotated.userId,
    );
    this.cookieService.setAuthCookies(
      res,
      access.accessToken,
      rotated.newToken,
    );
    return { expiresIn: access.expiresIn };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'logout',
    summary: 'Log out and clear auth cookies',
    description:
      'Reads the `rev_rt` cookie (sent because its Path `/api/auth/` ' +
      'prefix-matches this endpoint), revokes the refresh-token family ' +
      'server-side, and clears all three auth cookies on the response. ' +
      'No request body. No bearer / api-key auth — this endpoint is ' +
      'cookie-driven.',
  })
  @ApiHeader({
    name: 'Cookie',
    required: false,
    description:
      'Typically includes `rev_rt=<opaque token>`. If missing, local ' +
      'session state is still cleared on the response.',
    schema: { type: 'string' },
  })
  @ApiNoContentResponse({
    headers: {
      'Set-Cookie': {
        description:
          'Three Set-Cookie headers that clear `rev_at`, `rev_rt`, and `rev_session`.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiCommonErrors()
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    try {
      if (refreshToken) {
        await this.refreshTokenService.revokeFamilyByRawToken(refreshToken);
      }
    } finally {
      // Always tear down the client-side session even if server-side
      // revocation throws — the user clicked logout and expects the
      // browser to forget its credentials.
      this.cookieService.clearAuthCookies(res);
    }
  }

  @UseGuards(HttpJwtAuthGuard, HTTPSystemGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.User,
  })
  @Post('user')
  @ApiBearerAuth('access-token')
  @ApiSecurity('api-key')
  @ApiOperation({
    operationId: 'createUser',
    summary: 'Create a new user (admin only)',
  })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  async createUser(@Body() data: CreateUserDto): Promise<SuccessModelDto> {
    await this.authApiService.createUser({ ...data, isEmailConfirmed: true });

    return { success: true };
  }

  @UseGuards(HttpJwtAuthGuard)
  @Put('password')
  @ApiBearerAuth('access-token')
  @ApiSecurity('api-key')
  @ApiOperation({
    operationId: 'updatePassword',
    summary: 'Update your password',
  })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  async updatePassword(
    @Body() data: UpdatePasswordDto,
    @Request()
    req: {
      user: IAuthUser;
    },
  ): Promise<SuccessModelDto> {
    await this.userApiService.updatePassword({
      ...data,
      userId: req.user.userId,
    });

    return { success: true };
  }
}
