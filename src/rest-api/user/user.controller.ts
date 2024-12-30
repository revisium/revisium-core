import {
  Controller,
  Get,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HttpJwtAuthGuard } from 'src/auth/guards/jwt/http-jwt-auth-guard.service';
import { IAuthUser } from 'src/auth/types';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';
import { UserModel } from 'src/rest-api/user/model';
import { GetUserQuery, GetUserQueryReturnType } from 'src/user/queries/impl';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(private readonly queryBus: QueryBus) {}

  @UseGuards(HttpJwtAuthGuard)
  @Get('me')
  @ApiOperation({ operationId: 'me' })
  @ApiOkResponse({ type: UserModel })
  me(@Request() req: { user: IAuthUser }) {
    return this.queryBus.execute<GetUserQuery, GetUserQueryReturnType>(
      new GetUserQuery({ userId: req.user.userId }),
    );
  }
}
