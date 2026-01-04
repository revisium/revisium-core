import {
  Body,
  Controller,
  Post,
  Put,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCommonErrors } from 'src/api/rest-api/share/decorators';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPSystemGuard } from 'src/features/auth/guards/system.guard';
import { IAuthUser } from 'src/features/auth/types';
import { UserApiService } from 'src/features/user/user-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { CreateUserDto, LoginDto } from 'src/api/rest-api/auth/dto';
import { UpdatePasswordDto } from 'src/api/rest-api/auth/dto/update-password.dto';
import { LoginResponse } from 'src/api/rest-api/auth/model';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('Auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authApiService: AuthApiService,
    private readonly userApiService: UserApiService,
  ) {}

  @Post('login')
  @ApiOperation({
    operationId: 'login',
    summary: 'Authenticate and get access token',
  })
  @ApiOkResponse({ type: LoginResponse })
  @ApiCommonErrors()
  login(@Body() data: LoginDto) {
    return this.authApiService.login(data);
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
  @ApiOkResponse({ type: Boolean })
  @ApiCommonErrors()
  async createUser(@Body() data: CreateUserDto): Promise<boolean> {
    await this.authApiService.createUser({ ...data, isEmailConfirmed: true });

    return true;
  }

  @UseGuards(HttpJwtAuthGuard)
  @Put('password')
  @ApiOperation({ operationId: 'updatePassword', summary: 'Update your password' })
  @ApiOkResponse({ type: Boolean })
  @ApiCommonErrors()
  updatePassword(
    @Body() data: UpdatePasswordDto,
    @Request()
    req: {
      user: IAuthUser;
    },
  ) {
    return this.userApiService.updatePassword({
      ...data,
      userId: req.user.userId,
    });
  }
}
