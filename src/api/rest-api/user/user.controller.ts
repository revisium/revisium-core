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
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { UserModel } from 'src/api/rest-api/user/model';
import { GetUserQuery, GetUserQueryReturnType } from 'src/features/user/queries/impl';

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
