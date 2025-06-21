import {
  Controller,
  Delete,
  Get,
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
import { GetEndpointResultDto } from 'src/api/rest-api/endpoint/dto';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { DeleteEndpointCommand } from 'src/features/endpoint/commands/impl';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('/endpoints/:endpointId')
@ApiBearerAuth('access-token')
@ApiTags('Endpoint')
export class EndpointByIdController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly endpointApi: EndpointApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('relatives')
  @ApiOperation({
    operationId: 'endpointRelatives',
    summary: 'Retrieve all related entities for a given endpoint',
  })
  @ApiOkResponse({ type: GetEndpointResultDto })
  async endpointRelatives(
    @Param('endpointId') endpointId: string,
  ): Promise<GetEndpointResultDto> {
    return this.endpointApi.getEndpointRelatives({ endpointId });
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
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
