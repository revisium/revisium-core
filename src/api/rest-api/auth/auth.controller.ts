import {
  Body,
  Controller,
  Post,
  Put,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateUserCommand,
  CreateUserCommandReturnType,
  LoginCommand,
} from 'src/features/auth/commands/impl';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPSystemGuard } from 'src/features/auth/guards/system.guard';
import { IAuthUser } from 'src/features/auth/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { CreateUserDto, LoginDto } from 'src/api/rest-api/auth/dto';
import { UpdatePasswordDto } from 'src/api/rest-api/auth/dto/update-password.dto';
import { LoginResponse } from 'src/api/rest-api/auth/model';
import { UpdatePasswordCommand } from 'src/features/user/commands/impl';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('Auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @ApiOperation({ operationId: 'login' })
  @ApiOkResponse({ type: LoginResponse })
  login(@Body() data: LoginDto) {
    return this.commandBus.execute(new LoginCommand(data));
  }

  @UseGuards(HttpJwtAuthGuard, HTTPSystemGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.User,
  })
  @Post('user')
  @ApiOperation({ operationId: 'createUser' })
  @ApiOkResponse({ type: Boolean })
  async createUser(@Body() data: CreateUserDto): Promise<boolean> {
    await this.commandBus.execute<
      CreateUserCommand,
      CreateUserCommandReturnType
    >(new CreateUserCommand({ ...data, isEmailConfirmed: true }));

    return true;
  }

  @UseGuards(HttpJwtAuthGuard)
  @Put('password')
  @ApiOperation({ operationId: 'updatePassword' })
  @ApiOkResponse({ type: Boolean })
  updatePassword(
    @Body() data: UpdatePasswordDto,
    @Request()
    req: {
      user: IAuthUser;
    },
  ) {
    return this.commandBus.execute(
      new UpdatePasswordCommand({ ...data, userId: req.user.userId }),
    );
  }
}
