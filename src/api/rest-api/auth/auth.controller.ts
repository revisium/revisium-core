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

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('Auth')
@ApiBearerAuth('access-token')
@ApiSecurity('api-key')
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
  })
  @ApiOkResponse({ type: LoginResponse })
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
  })
  @ApiOkResponse({ type: RefreshResponse })
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

    try {
      const { userId, newToken } = await this.refreshTokenService.rotateToken(
        refreshToken,
        { ip: req.ip, userAgent: req.headers['user-agent'] },
      );
      const access =
        await this.authApiService.issueAccessTokenForUserId(userId);
      this.cookieService.setAuthCookies(res, access.accessToken, newToken);
      return { expiresIn: access.expiresIn };
    } catch (error) {
      this.cookieService.clearAuthCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'logout',
    summary: 'Log out and clear auth cookies',
  })
  @ApiNoContentResponse()
  @ApiCommonErrors()
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await this.refreshTokenService.revokeFamilyByRawToken(refreshToken);
    }
    this.cookieService.clearAuthCookies(res);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPSystemGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.User,
  })
  @Post('user')
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
