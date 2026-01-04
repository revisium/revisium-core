import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCommonErrors,
  ApiEndpointIdParam,
  ApiNotFoundError,
} from 'src/api/rest-api/share/decorators';
import { GetEndpointResultDto } from 'src/api/rest-api/endpoint/dto';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
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
  constructor(private readonly endpointApi: EndpointApiService) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('relatives')
  @ApiEndpointIdParam()
  @ApiOperation({
    operationId: 'endpointRelatives',
    summary: 'Get endpoint with all related entities',
  })
  @ApiOkResponse({ type: GetEndpointResultDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Endpoint')
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
  @ApiEndpointIdParam()
  @ApiOperation({
    operationId: 'deleteEndpoint',
    summary: 'Delete an endpoint',
  })
  @ApiOkResponse({ type: Boolean })
  @ApiCommonErrors()
  @ApiNotFoundError('Endpoint')
  async deleteEndpoint(@Param('endpointId') endpointId: string): Promise<true> {
    await this.endpointApi.deleteEndpoint({ endpointId });

    return true;
  }
}
