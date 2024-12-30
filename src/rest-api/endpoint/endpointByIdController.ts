import {
  Controller,
  Delete,
  Param,
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
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { HttpJwtAuthGuard } from 'src/auth/guards/jwt/http-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/auth/guards/project.guard';
import { DeleteEndpointCommand } from 'src/endpoint/commands/impl';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';

@UseInterceptors(RestMetricsInterceptor)
@UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('/endpoints/:endpointId')
@ApiBearerAuth('access-token')
@ApiTags('Endpoint')
export class EndpointByIdController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete()
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Endpoint,
  })
  @ApiOperation({ operationId: 'deleteEndpoint' })
  @ApiOkResponse({ type: Boolean })
  async deleteEndpoint(@Param('endpointId') endpointId: string): Promise<true> {
    await this.commandBus.execute(new DeleteEndpointCommand({ endpointId }));

    return true;
  }
}
