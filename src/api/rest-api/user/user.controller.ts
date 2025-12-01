import {
  Controller,
  Get,
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
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { UserApiService } from 'src/features/user/user-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { UserModel } from 'src/api/rest-api/user/model';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(private readonly userApiService: UserApiService) {}

  @UseGuards(HttpJwtAuthGuard)
  @Get('me')
  @ApiOperation({ operationId: 'me' })
  @ApiOkResponse({ type: UserModel })
  me(@Request() req: { user: IAuthUser }) {
    return this.userApiService.getUser({ userId: req.user.userId });
  }
}
